# WhatsApp Bulk Sender Flask Backend Server
# Optimized with Chrome self-healing launch, light healthcheck, and auto-cleanup.
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import os
import time
import atexit
import sqlite3
try:
    import psycopg2
    from psycopg2 import IntegrityError as PGIntegrityError
except ImportError:
    psycopg2 = None
    class PGIntegrityError(Exception):
        pass
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    cloudinary = None

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path)

# Configure Cloudinary if credentials are provided in .env
cloudinary_configured = False
if cloudinary is not None:
    cloudinary_cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key = os.getenv("CLOUDINARY_API_KEY")
    cloudinary_api_secret = os.getenv("CLOUDINARY_API_SECRET")
    
    if cloudinary_cloud_name and cloudinary_api_key and cloudinary_api_secret:
        try:
            cloudinary.config(
                cloud_name=cloudinary_cloud_name,
                api_key=cloudinary_api_key,
                api_secret=cloudinary_api_secret,
                secure=True
            )
            cloudinary_configured = True
            print("[*] Cloudinary configured successfully.")
        except Exception as e:
            print(f"[!] Error configuring Cloudinary: {e}")

frontend_dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Frontend", "dist"))
app = Flask(__name__, static_folder=frontend_dist_dir, static_url_path="")
CORS(app, resources={r"/*": {
    "origins": "*",
    "allow_headers": ["Content-Type", "Authorization", "X-User-Id", "x-user-id"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}}) # Enable CORS for React frontend

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-User-Id,x-user-id'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

new_msg_time = 10
country_code = "91"
driver = None

def cleanup():
    global driver
    if driver is not None:
        print("\n[*] Shutting down Chrome webdriver...")
        try:
            driver.quit()
        except Exception:
            pass

atexit.register(cleanup)

def get_driver():
    global driver
    # Check if driver is already running and responsive
    if driver is not None:
        try:
            # Try to get current URL to verify if browser is open and connected
            driver.current_url
            return driver
        except Exception:
            print("Browser was closed or disconnected. Re-opening Chrome...")
            try:
                driver.quit()
            except Exception:
                pass
            driver = None

    def cleanup_stale_processes():
        print("[*] Cleaning up lingering WhatsApp Chrome/ChromeDriver processes...")
        try:
            import psutil
            # 1. Kill lingering chromedriver
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    proc_name = proc.info['name']
                    if proc_name and proc_name.lower() in ['chromedriver', 'chromedriver.exe']:
                        proc.kill()
                except Exception:
                    pass
            
            # 2. Kill lingering chrome instances using our custom session profile
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    proc_name = proc.info['name']
                    if proc_name and proc_name.lower() in ['chrome', 'chrome.exe', 'google-chrome']:
                        cmdline = proc.info['cmdline']
                        if cmdline and any('whatsapp_chrome_session' in arg for arg in cmdline):
                            proc.kill()
                except Exception:
                    pass
            time.sleep(0.5)
            print("[*] Stale WhatsApp Chrome processes cleaned up.")
        except Exception as cleanup_err:
            print(f"Lingering process cleanup warning: {cleanup_err}")

    # Initialize a new Chrome webdriver with persistent session profile
    print("Starting WhatsApp Selenium webdriver...")
    options = Options()
    
    # Store chrome data inside the main.py directory so login persists
    profile_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "whatsapp_chrome_session")
    
    # Pre-clean lock files at root level to release stale locks
    if os.path.exists(profile_path):
        try:
            for root, dirs, files in os.walk(profile_path):
                for file in files:
                    if "lock" in file.lower():
                        try:
                            os.remove(os.path.join(root, file))
                            print(f"Pre-cleaned stale lock file: {file}")
                        except Exception:
                            pass
                break # Only root level files
        except Exception:
            pass

    options.add_argument(f"user-data-dir={profile_path}")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    
    # Low-memory & resource optimization arguments for Render Free Tier
    options.add_argument("--single-process")
    options.add_argument("--no-zygote")
    options.add_argument("--disable-features=site-per-process")
    options.add_argument('--js-flags="--max-old-space-size=128"')
    
    is_headless = os.environ.get("HEADLESS") == "true" or os.environ.get("RENDER") is not None
    if is_headless:
        print("[*] Headless mode enabled. Configuring headless Chrome options...")
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1280,800")
        options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
        
        # Help Selenium find Chrome in headless Docker environments
        chrome_paths = [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser"
        ]
        for path in chrome_paths:
            if os.path.exists(path):
                options.binary_location = path
                print(f"[*] Custom Chrome binary path set: {path}")
                break
    
    try:
        print("[*] Launching Chrome driver (direct)...")
        driver = webdriver.Chrome(options=options)
    except Exception as e:
        print(f"[!] Direct Chrome launch failed: {e}. Cleaning stale processes and trying fallback with ChromeDriverManager...")
        cleanup_stale_processes()
        try:
            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        except Exception as e2:
            err_msg = str(e2)
            if "DevToolsActivePort" in err_msg or "crashed" in err_msg or "session not created" in err_msg:
                print("\n[!] Chrome failed to start with current profile. Cleaning stale processes and initializing self-healing fallback...")
                cleanup_stale_processes()
                
                # Fallback 1: Rename the locked/corrupted profile directory so Chrome starts fresh
                backup_path = profile_path + f"_backup_{int(time.time())}"
                try:
                    if os.path.exists(profile_path):
                        os.rename(profile_path, backup_path)
                        print(f"[*] Moved locked/corrupted profile to backup: {backup_path}")
                except Exception as rename_err:
                    print(f"[!] Could not rename profile folder: {rename_err}")
                    
                # Retry starting Chrome with a clean profile directory path
                try:
                    print("[*] Retrying Chrome launch with clean profile (direct)...")
                    driver = webdriver.Chrome(options=options)
                except Exception as retry_err:
                    print(f"[!] Direct clean retry failed: {retry_err}. Trying with ChromeDriverManager...")
                    try:
                        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
                        print("[*] Started Chrome successfully with a fresh profile. Please scan the QR code.")
                    except Exception as retry_err2:
                        print(f"[!] Clean profile initialization failed: {retry_err2}")
                        
                        # Fallback 2: Start Chrome without user-data-dir (incognito/guest style)
                        print("[*] Attempting Fallback 2: Launching Chrome without custom profile directory...")
                        clean_options = Options()
                        clean_options.add_argument("--no-sandbox")
                        clean_options.add_argument("--disable-dev-shm-usage")
                        clean_options.add_argument("--disable-gpu")
                        clean_options.add_argument("--disable-extensions")
                        clean_options.add_argument("--disable-blink-features=AutomationControlled")
                        clean_options.add_experimental_option("excludeSwitches", ["enable-automation"])
                        clean_options.add_experimental_option('useAutomationExtension', False)
                        
                        # Low-memory & resource optimization arguments for Render Free Tier
                        clean_options.add_argument("--single-process")
                        clean_options.add_argument("--no-zygote")
                        clean_options.add_argument("--disable-features=site-per-process")
                        clean_options.add_argument('--js-flags="--max-old-space-size=128"')
                        if is_headless:
                            clean_options.add_argument("--headless=new")
                            clean_options.add_argument("--window-size=1280,800")
                            clean_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
                            for path in chrome_paths:
                                if os.path.exists(path):
                                    clean_options.binary_location = path
                                    break
                        try:
                            print("[*] Launching Chrome in guest mode (direct)...")
                            driver = webdriver.Chrome(options=clean_options)
                            print("[*] Chrome launched successfully in guest mode.")
                        except Exception as final_err:
                            print(f"[!] Direct guest mode failed: {final_err}. Trying with ChromeDriverManager...")
                            try:
                                driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=clean_options)
                                print("[*] Chrome launched successfully in guest mode.")
                            except Exception as final_err2:
                                explanation = f"Critical Chrome start error: {str(final_err2)}. Please verify Chrome is installed."
                                print(f"\n[!] FATAL: {explanation}\n")
                                raise Exception(explanation)
            else:
                raise e2
    
    # Apply anti-bot bypass before navigating or doing anything!
    try:
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        })
        print("[*] Stealth mode enabled: navigator.webdriver hidden successfully.")
    except Exception as stealth_err:
        print(f"[!] Warning: Could not enable stealth mode: {stealth_err}")

    # Load WhatsApp Web initially
    print("Opening WhatsApp Web. Please scan the QR code to log in (if not already logged in).")
    driver.get('https://web.whatsapp.com')
    return driver

# Chrome will be initialized dynamically on the first message sending request instead of startup.

def upload_files_via_helper(active_driver, files, is_media):
    # 1. Inject the click interception script
    active_driver.execute_script("""
        window._lastClickedInput = null;
        if (!window._originalInputClick) {
            window._originalInputClick = HTMLInputElement.prototype.click;
        }
        HTMLInputElement.prototype.click = function() {
            window._lastClickedInput = this;
            if (!this.id) {
                this.id = 'dynamic_upload_input_' + Math.random().toString(36).substr(2, 9);
            }
            if (!document.body.contains(this)) {
                document.body.appendChild(this);
            }
        };
    """)
    
    # 2. Click the attach button to open the menu
    try:
        attach_btn = WebDriverWait(active_driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//div[@title="Attach"] | //button[@title="Attach"] | //span[@data-icon="plus"] | //span[@data-icon="clip"] | //div[@aria-label="Attach"] | //span[@data-testid="plus"] | //button[@aria-label="Attach"]'))
        )
        active_driver.execute_script("arguments[0].click();", attach_btn)
        print("Clicked attach button to open attachment menu.")
        time.sleep(0.3)
    except Exception as attach_err:
        print(f"Warning: Could not click attach button: {attach_err}")
        
    # 3. Click the target menu button (Photos & videos or Document)
    from selenium.common.exceptions import StaleElementReferenceException
    button_xpath = '//button[@aria-label="Photos & videos" or @aria-label="Photos &amp; videos"] | //div[@aria-label="Photos & videos"]' if is_media else '//button[@aria-label="Document"] | //div[@aria-label="Document"]'
    
    menu_btn = None
    for attempt in range(5):
        try:
            menu_btn = WebDriverWait(active_driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, button_xpath))
            )
            active_driver.execute_script("arguments[0].click();", menu_btn)
            print("Clicked menu button successfully.")
            break
        except (StaleElementReferenceException, Exception) as click_err:
            print(f"Click attempt {attempt} failed: {click_err}. Retrying...")
            time.sleep(0.2)
    
    # 4. Wait for window._lastClickedInput to be set and retrieve its ID
    input_id = None
    for _ in range(25):
        input_id = active_driver.execute_script("return window._lastClickedInput ? window._lastClickedInput.id : null;")
        if input_id:
            break
        time.sleep(0.1)
        
    # 5. Restore the original click function immediately
    active_driver.execute_script("""
        if (window._originalInputClick) {
            HTMLInputElement.prototype.click = window._originalInputClick;
        }
    """)
    
    if not input_id:
        raise Exception("Timed out waiting for dynamic file input to be created by WhatsApp Web.")
        
    # 6. Locate the input element in Selenium
    file_input = active_driver.find_element(By.ID, input_id)
    
    # 7. Upload the files
    accept_attr = "unknown"
    try:
        accept_attr = file_input.get_attribute('accept')
    except Exception:
        pass
    file_input.send_keys("\n".join(files))
    print(f"Sent {len(files)} files to dynamic input with accept='{accept_attr}': {files}")
    
    # 8 & 9. Find the send button on the preview screen and click it, retrying if it becomes stale
    clicked = False
    last_err = None
    for attempt in range(15):
        try:
            send_btn = WebDriverWait(active_driver, 3).until(
                EC.element_to_be_clickable((By.XPATH, 
                    '//div[not(ancestor::footer) and @role="button" and (contains(@aria-label, "Send") or .//span[@data-icon="send"] or .//span[contains(@data-testid, "send")])] | '
                    '//button[not(ancestor::footer) and (contains(@aria-label, "Send") or .//span[@data-icon="send"] or .//span[contains(@data-testid, "send")])] | '
                    '//*[not(ancestor::footer) and (@data-icon="send" or @data-testid="send" or @aria-label="Send" or contains(@aria-label, "Send"))]'
                ))
            )
            try:
                send_btn.click()
            except Exception:
                active_driver.execute_script("arguments[0].click();", send_btn)
            print(f"Clicked attachment send button successfully on attempt {attempt + 1}.")
            clicked = True
            break
        except Exception as e:
            last_err = e
            print(f"Attempt {attempt + 1} to click attachment send button failed: {e}. Retrying...")
            time.sleep(0.5)
            
    if not clicked:
        raise Exception(f"Timed out waiting to click the attachment send button: {last_err}")
    
    # 10. Wait for main chat textbox to return
    WebDriverWait(active_driver, 25).until(
        EC.element_to_be_clickable((By.XPATH, '//footer//div[@contenteditable="true" and @role="textbox"] | //div[@contenteditable="true" and @data-tab="10"]')),
        message="Timed out waiting for main chat textbox to return after attachment send."
    )
    print("Returned to main chat screen successfully.")
    time.sleep(0.3)

@app.route('/api/health', methods=['GET', 'POST'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/api/upload', methods=['POST'])
def upload_file_to_cloudinary():
    if not cloudinary_configured:
        return jsonify({"status": "Error", "message": "Cloudinary is not configured on the server. Please check your .env credentials."}), 400
        
    if 'file' not in request.files:
        return jsonify({"status": "Error", "message": "No file part in the request"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "Error", "message": "No file selected"}), 400
        
    try:
        # Save file to a temp path
        temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_attachments")
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
            
        filename = secure_filename(file.filename)
        filename = f"upload_{int(time.time())}_{filename}"
        file_path = os.path.join(temp_dir, filename)
        file.save(file_path)
        
        # Upload to Cloudinary
        folder_name = os.getenv("CLOUDINARY_FOLDER", "whats_bulk_app")
        response = cloudinary.uploader.upload(file_path, folder=folder_name, resource_type="auto")
        
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return jsonify({
            "status": "Success",
            "message": "File uploaded to Cloudinary successfully!",
            "url": response.get("secure_url"),
            "public_id": response.get("public_id")
        }), 200
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/send', methods=['POST'])
def send_whatsapp_message():
    saved_files = []
    try:
        # Check content type for multipart/form-data
        if request.content_type and 'multipart/form-data' in request.content_type:
            phone = request.form.get('phone', '').strip()
            message = request.form.get('message', '').strip()
            attachments = request.files.getlist('attachments')
        else:
            data = request.json or {}
            phone = data.get('phone', '').strip()
            message = data.get('message', '').strip()
            attachments = []
        
        if not phone:
            return jsonify({"status": "Error", "message": "Phone number is required!"}), 400
            
        # Clean phone number: remove '+', spaces, brackets, hyphens
        clean_phone = "".join(c for c in phone if c.isdigit())
        
        if len(clean_phone) < 7:
            return jsonify({"status": "Error", "message": f"Phone number is too short or invalid: {phone}"}), 400
        
        # Get active driver (re-opens if user closed it) - now called ONLY for valid phone numbers
        active_driver = get_driver()
        
        # Save attachments to temp folder
        temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_attachments")
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
            
        for file in attachments:
            if file.filename:
                filename = secure_filename(file.filename)
                # Add timestamp to avoid collisions
                filename = f"{int(time.time())}_{filename}"
                file_path = os.path.join(temp_dir, filename)
                file.save(file_path)
                saved_files.append(file_path)
                
                # Automatically backup to Cloudinary if configured
                if cloudinary_configured:
                    try:
                        folder_name = os.getenv("CLOUDINARY_FOLDER", "whats_bulk_app")
                        res = cloudinary.uploader.upload(file_path, folder=folder_name, resource_type="auto")
                        print(f"[*] Backup: Attachment '{file.filename}' uploaded to Cloudinary. URL: {res.get('secure_url')}")
                    except Exception as cl_err:
                        print(f"[!] Cloudinary backup warning: {cl_err}")
        
        # If it's a 10 digit number, assume Indian country code (91)
        if len(clean_phone) == 10:
            clean_phone = country_code + clean_phone
            
        print(f"Sending message to: {clean_phone}")
        
        # Dismiss any unexpected browser alerts (like beforeunload) before navigating
        try:
            alert = active_driver.switch_to.alert
            alert.accept()
            print("Dismissed active browser alert.")
        except Exception:
            pass
            
        # Find the old textbox if it exists to detect page transition
        old_textbox = None
        try:
            old_textbox = active_driver.find_element(By.XPATH, '//footer//div[@contenteditable="true" and @role="textbox"]')
        except Exception:
            pass

        link = f'https://web.whatsapp.com/send/?phone={clean_phone}'
        active_driver.get(link)
        
        # Wait for SPA navigation to start and old elements to clear
        if old_textbox:
            try:
                WebDriverWait(active_driver, 8).until(EC.staleness_of(old_textbox))
                print("Transition to new chat started.")
            except Exception:
                time.sleep(0.5)
        else:
            time.sleep(0.1)
        
        # Wait for either the chat text box OR the invalid number popup/dialog to appear
        target_xpath = (
            '//footer//div[@contenteditable="true" and @role="textbox"] | '
            '//div[@contenteditable="true" and @data-tab="10"] | '
            '//div[@role="dialog"]'
        )
        
        try:
            element = WebDriverWait(active_driver, 25).until(
                EC.presence_of_element_located((By.XPATH, target_xpath))
            )
        except Exception:
            # Check if we are on the login/QR code page (logged out status)
            try:
                active_driver.find_element(By.TAG_NAME, "canvas")
                return jsonify({"status": "Error", "message": "WhatsApp session is logged out. Please scan the QR code in the browser window first!"}), 401
            except Exception:
                pass
            return jsonify({"status": "Error", "message": "Chat screen failed to load (timeout)!"}), 500
            
        # Check if the resolved element is the textbox
        is_textbox = False
        try:
            role = element.get_attribute("role")
            contenteditable = element.get_attribute("contenteditable")
            data_tab = element.get_attribute("data-tab")
            tag_name = element.tag_name
            if (role == "textbox" or contenteditable == "true" or data_tab == "10") and tag_name != "dialog" and role != "dialog":
                is_textbox = True
        except Exception:
            pass

        if not is_textbox:
            # Check if a dialog is actually present and if it specifies invalid number
            is_invalid = False
            try:
                dialog_text = element.text.lower()
                if "invalid" in dialog_text or "phone number" in dialog_text or "url" in dialog_text or "अमान्य" in dialog_text:
                    is_invalid = True
            except Exception:
                pass
                
            if is_invalid:
                print(f"Invalid phone number popup detected for: {phone}")
                try:
                    # Try to click the OK or Close button inside the dialog to dismiss it
                    ok_btn = element.find_element(By.XPATH, './/div[@role="button"] | .//button | //div[@role="button" or @type="button" or self::button][contains(translate(., "ok", "OK"), "OK") or contains(translate(., "close", "CLOSE"), "CLOSE")]')
                    ok_btn.click()
                    print("Clicked popup OK/Close button to dismiss dialog.")
                    time.sleep(1)
                except Exception as btn_err:
                    print(f"Could not click popup OK button: {btn_err}")
                return jsonify({"status": "Error", "message": "Phone number is not registered on WhatsApp!"}), 400
            else:
                # If there's some other non-blocking dialog, wait for textbox as fallback
                print("Non-blocking popup or dialog found. Waiting for textbox...")
                try:
                    element = WebDriverWait(active_driver, 10).until(
                        EC.presence_of_element_located((By.XPATH, '//footer//div[@contenteditable="true" and @role="textbox"] | //div[@contenteditable="true" and @data-tab="10"]'))
                    )
                    is_textbox = True
                except Exception:
                    return jsonify({"status": "Error", "message": "Chat screen failed to load due to blocking popup!"}), 500
        
        # If there is message text, send it
        if message:
            # Click the textbox specifically to focus it
            try:
                element.click()
                time.sleep(0.1)
            except Exception as click_err:
                print(f"Warning: Could not click textbox element: {click_err}")

            actions = ActionChains(active_driver)
            actions.click(element) # Explicitly focus element in the action chain
            for line in message.split('\n'):
                actions.send_keys(line)
                # SHIFT + ENTER for line break
                actions.key_down(Keys.SHIFT).send_keys(Keys.ENTER).key_up(Keys.SHIFT)
            actions.send_keys(Keys.ENTER)
            actions.perform()
            time.sleep(0.2)
            
            # Fallback: Click the send button if Enter key press didn't send/clear it
            try:
                # Check if the textbox still contains text before clicking fallback
                textbox_text = element.text or element.get_attribute("innerText") or ""
                if textbox_text.strip():
                    send_btn = active_driver.find_element(By.XPATH, '//span[@data-icon="send"] | //button[@data-testid="compose-btn-send"] | //span[@data-testid="send"]')
                    send_btn.click()
                    print("Clicked Send button fallback.")
                    time.sleep(0.2)
            except Exception:
                pass
            
            time.sleep(0.2)
            
        # Send attachments if any
        media_files = []
        document_files = []
        for file_path in saved_files:
            if os.path.exists(file_path):
                ext = os.path.splitext(file_path)[1].lower()
                is_media = ext in ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.3gp', '.webp']
                if is_media:
                    media_files.append(os.path.abspath(file_path))
                else:
                    document_files.append(os.path.abspath(file_path))

        # 1. Upload Media Files if any
        if media_files:
            upload_files_via_helper(active_driver, media_files, is_media=True)

        # 2. Upload Document Files if any
        if document_files:
            upload_files_via_helper(active_driver, document_files, is_media=False)
        
        return jsonify({"status": "Success", "message": f"Successfully sent to {phone}!"}), 200
        
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        return jsonify({"status": "Error", "message": str(e)}), 500
        
    finally:
        # Clean up temp files
        for file_path in saved_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Failed to delete temp file {file_path}: {e}")

@app.route('/api/launch', methods=['POST', 'GET'])
def launch_whatsapp():
    try:
        get_driver()
        return jsonify({"status": "Success", "message": "WhatsApp Web launched successfully!"}), 200
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

# --- DATABASE ENDPOINTS ---
def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if db_url and (db_url.startswith("postgresql://") or db_url.startswith("postgres://")):
        if psycopg2 is None:
            raise Exception("psycopg2-binary is not installed. Please run 'pip install psycopg2-binary' to connect to PostgreSQL.")
        return psycopg2.connect(db_url), "postgres"
    else:
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "contacts.db")
        return sqlite3.connect(db_path), "sqlite"

def execute_db_query(cursor, query, params=(), db_type="sqlite"):
    if db_type == "postgres":
        query = query.replace("?", "%s")
    cursor.execute(query, params)

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    user_id = request.headers.get('X-User-Id') or request.args.get('user_id')
    if not user_id:
        return jsonify({"status": "Error", "message": "User context is required!"}), 400
        
    try:
        conn, db_type = get_db_connection()
        cursor = conn.cursor()
        execute_db_query(cursor, "SELECT id, name, phone FROM contacts WHERE user_id = ? ORDER BY name ASC", (user_id,), db_type)
        rows = cursor.fetchall()
        conn.close()
        contacts = [{"id": row[0], "name": row[1], "phone": row[2]} for row in rows]
        return jsonify(contacts), 200
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/contacts', methods=['POST'])
def add_contact():
    user_id = request.headers.get('X-User-Id') or request.args.get('user_id')
    data = request.json or {}
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    if not user_id:
        return jsonify({"status": "Error", "message": "User context is required!"}), 400
    if not name or not phone:
        return jsonify({"status": "Error", "message": "Name and phone number are required!"}), 400
    
    clean_phone = "".join(c for c in phone if c.isdigit())
    if len(clean_phone) < 7:
        return jsonify({"status": "Error", "message": "Phone number is too short or invalid!"}), 400
        
    try:
        conn, db_type = get_db_connection()
        cursor = conn.cursor()
        
        # Check current contact count to enforce 1000 limit
        execute_db_query(cursor, "SELECT COUNT(*) FROM contacts WHERE user_id = ?", (user_id,), db_type)
        count = cursor.fetchone()[0]
        if count >= 1000:
            conn.close()
            return jsonify({"status": "Error", "message": "Directory limit reached: You can save a maximum of 1000 contacts!"}), 400
            
        execute_db_query(cursor, "INSERT INTO contacts (user_id, name, phone) VALUES (?, ?, ?)", (user_id, name, clean_phone), db_type)
        conn.commit()
        conn.close()
        return jsonify({"status": "Success", "message": "Contact added successfully!"}), 201
    except (sqlite3.IntegrityError, PGIntegrityError):
        return jsonify({"status": "Error", "message": "Phone number already exists in your database!"}), 400
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    user_id = request.headers.get('X-User-Id') or request.args.get('user_id')
    if not user_id:
        return jsonify({"status": "Error", "message": "User context is required!"}), 400
        
    try:
        conn, db_type = get_db_connection()
        cursor = conn.cursor()
        execute_db_query(cursor, "DELETE FROM contacts WHERE id = ? AND user_id = ?", (contact_id, user_id), db_type)
        conn.commit()
        conn.close()
        return jsonify({"status": "Success", "message": "Contact deleted successfully!"}), 200
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/contacts/<int:contact_id>', methods=['PUT'])
def edit_contact(contact_id):
    user_id = request.headers.get('X-User-Id') or request.args.get('user_id')
    data = request.json or {}
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    
    if not user_id:
        return jsonify({"status": "Error", "message": "User context is required!"}), 400
    if not name or not phone:
        return jsonify({"status": "Error", "message": "Name and phone number are required!"}), 400
        
    clean_phone = "".join(c for c in phone if c.isdigit())
    if len(clean_phone) < 7:
        return jsonify({"status": "Error", "message": "Phone number is too short or invalid!"}), 400
        
    try:
        conn, db_type = get_db_connection()
        cursor = conn.cursor()
        execute_db_query(cursor, "UPDATE contacts SET name = ?, phone = ? WHERE id = ? AND user_id = ?", (name, clean_phone, contact_id, user_id), db_type)
        conn.commit()
        conn.close()
        return jsonify({"status": "Success", "message": "Contact updated successfully!"}), 200
    except (sqlite3.IntegrityError, PGIntegrityError):
        return jsonify({"status": "Error", "message": "Phone number already exists in your database!"}), 400
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/contacts/search', methods=['GET'])
def search_contacts():
    user_id = request.headers.get('X-User-Id') or request.args.get('user_id')
    query = request.args.get('q', '').strip()
    if not user_id:
        return jsonify({"status": "Error", "message": "User context is required!"}), 400
        
    try:
        conn, db_type = get_db_connection()
        cursor = conn.cursor()
        execute_db_query(
            cursor,
            "SELECT id, name, phone FROM contacts WHERE user_id = ? AND (name LIKE ? OR phone LIKE ?) ORDER BY name ASC",
            (user_id, f"%{query}%", f"%{query}%"),
            db_type
        )
        rows = cursor.fetchall()
        conn.close()
        contacts = [{"id": row[0], "name": row[1], "phone": row[2]} for row in rows]
        return jsonify(contacts), 200
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"status": "Error", "message": "Email and password are required!"}), 400

    if len(password) < 6:
        return jsonify({"status": "Error", "message": "Password must be at least 6 characters long!"}), 400

    try:
        conn, db_type = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user already exists
        execute_db_query(cursor, "SELECT id FROM users WHERE email = ?", (email,), db_type)
        if cursor.fetchone():
            conn.close()
            return jsonify({"status": "Error", "message": "User with this email already exists!"}), 400

        # Hash password and insert
        hashed_password = generate_password_hash(password)
        execute_db_query(cursor, "INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, hashed_password), db_type)
        conn.commit()
        conn.close()

        return jsonify({"status": "Success", "message": "User registered successfully!"}), 201
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"status": "Error", "message": "Email and password are required!"}), 400

    try:
        conn, db_type = get_db_connection()
        cursor = conn.cursor()
        execute_db_query(cursor, "SELECT id, email, password_hash FROM users WHERE email = ?", (email,), db_type)
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"status": "Error", "message": "Invalid email or password!"}), 401

        user_id, user_email, password_hash = row
        if not check_password_hash(password_hash, password):
            return jsonify({"status": "Error", "message": "Invalid email or password!"}), 401

        return jsonify({
            "status": "Success",
            "message": "Login successful!",
            "user": {
                "id": user_id,
                "email": user_email
            }
        }), 200
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

def send_reset_email(to_email, reset_link):
    smtp_server = os.getenv("SMTP_HOST") or os.getenv("SMTP_SERVER") or "smtp.gmail.com"
    try:
        smtp_port = int(os.getenv("SMTP_PORT") or 587)
    except ValueError:
        smtp_port = 587
        
    smtp_user = os.getenv("SMTP_USER") or os.getenv("SENDER_EMAIL")
    smtp_pass = os.getenv("SMTP_PASS") or os.getenv("SENDER_PASSWORD")
    from_email = os.getenv("FROM_EMAIL") or smtp_user

    if not smtp_user or not smtp_pass:
        raise Exception("SMTP credentials are not configured in .env file.")

    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = "Password Reset Link - Whats-Bulk"

    body = f"""Hi,

You requested a password reset for your Whats-Bulk account.
Click the link below to reset your password:

{reset_link}

This link will expire in 15 minutes.
If you did not request this, please ignore this email.
"""
    msg.attach(MIMEText(body, 'plain'))

    # Connect to SMTP server and send email
    server = smtplib.SMTP(smtp_server, smtp_port)
    server.starttls()
    server.login(smtp_user, smtp_pass)
    server.sendmail(from_email, to_email, msg.as_string())
    server.quit()

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({"status": "Error", "message": "Email is required!"}), 400

    try:
        conn, db_type = get_db_connection()
        cursor = conn.cursor()
        execute_db_query(cursor, "SELECT id FROM users WHERE email = ?", (email,), db_type)
        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({"status": "Error", "message": "No account registered with this email!"}), 404

        # Generate unique secure token
        token = secrets.token_urlsafe(32)
        expiry = int(time.time()) + 900 # 15 minutes validity
        
        # Save token in database
        execute_db_query(cursor, "INSERT INTO password_resets (email, token, expiry) VALUES (?, ?, ?)", (email, token, expiry), db_type)
        conn.commit()
        conn.close()

        # Build reset link
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url}/reset-password?token={token}"

        # Send SMTP email
        try:
            send_reset_email(email, reset_link)
            return jsonify({
                "status": "Success",
                "message": "A password reset link has been sent to your email!"
            }), 200
        except Exception as mail_err:
            print(f"SMTP Mail Error: {str(mail_err)}")
            print(f"\n[DEBUG RESET LINK]: {reset_link}\n")
            return jsonify({
                "status": "Success",
                "message": "Notice: SMTP email could not be sent (check .env config). Dev fallback active.",
                "reset_link": reset_link
            }), 200
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    token = data.get('token', '').strip()
    new_password = data.get('password', '').strip()

    if not token or not new_password:
        return jsonify({"status": "Error", "message": "Token and password are required!"}), 400

    if len(new_password) < 6:
        return jsonify({"status": "Error", "message": "Password must be at least 6 characters long!"}), 400

    try:
        conn, db_type = get_db_connection()
        cursor = conn.cursor()

        # Check token validity and expiry
        current_time = int(time.time())
        execute_db_query(cursor, "SELECT email, expiry FROM password_resets WHERE token = ?", (token,), db_type)
        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({"status": "Error", "message": "Invalid or expired reset token!"}), 400

        email, expiry = row
        if current_time > expiry:
            # Delete expired token
            execute_db_query(cursor, "DELETE FROM password_resets WHERE token = ?", (token,), db_type)
            conn.commit()
            conn.close()
            return jsonify({"status": "Error", "message": "Reset token has expired!"}), 400

        # Update user's password
        hashed_password = generate_password_hash(new_password)
        execute_db_query(cursor, "UPDATE users SET password_hash = ? WHERE email = ?", (hashed_password, email), db_type)
        
        # Delete token after successful use
        execute_db_query(cursor, "DELETE FROM password_resets WHERE email = ?", (email,), db_type)
        
        conn.commit()
        conn.close()

        return jsonify({"status": "Success", "message": "Password reset successfully!"}), 200
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

def init_db():
    try:
        conn, db_type = get_db_connection()
        cursor = conn.cursor()
        
        if db_type == "postgres":
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                UNIQUE(user_id, phone)
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS password_resets (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expiry INTEGER NOT NULL
            )
            """)
            conn.commit()
            conn.close()
            print("PostgreSQL Database initialized successfully.")
            return

        # Check if contacts table exists for SQLite
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'")
        contacts_exists = cursor.fetchone()
        
        if contacts_exists:
            cursor.execute("PRAGMA table_info(contacts)")
            columns = [row[1] for row in cursor.fetchall()]
            if "user_id" not in columns:
                cursor.execute("ALTER TABLE contacts RENAME TO old_contacts")
                cursor.execute("""
                CREATE TABLE contacts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    UNIQUE(user_id, phone)
                )
                """)
                # Try to assign old contacts to first user if exists, else default to 1
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
                users_exists = cursor.fetchone()
                default_user_id = 1
                if users_exists:
                    try:
                        cursor.execute("SELECT id FROM users LIMIT 1")
                        first_user_row = cursor.fetchone()
                        if first_user_row:
                            default_user_id = first_user_row[0]
                    except Exception:
                        pass
                
                cursor.execute("INSERT OR IGNORE INTO contacts (id, user_id, name, phone) SELECT id, ?, name, phone FROM old_contacts", (default_user_id,))
                cursor.execute("DROP TABLE old_contacts")
                print("Database migrated to multi-user contacts format.")
        else:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                UNIQUE(user_id, phone)
            )
            """)
            
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expiry INTEGER NOT NULL
        )
        """)
        conn.commit()
        conn.close()
        print("SQLite Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")

@app.route('/api/inspect_inputs', methods=['GET'])
def inspect_inputs():
    global driver
    if driver is None:
        return jsonify({"status": "error", "message": "No active driver session"}), 400
    try:
        inputs = driver.find_elements(By.XPATH, '//input')
        input_details = []
        for inp in inputs:
            try:
                input_details.append({
                    "tag": inp.tag_name,
                    "type": inp.get_attribute("type"),
                    "accept": inp.get_attribute("accept"),
                    "outerHTML": inp.get_attribute("outerHTML")[:250]
                })
            except Exception:
                pass
        return jsonify({"status": "success", "inputs": input_details}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/init_driver', methods=['GET'])
def init_driver():
    global driver
    try:
        active_driver = get_driver()
        active_driver.get("https://web.whatsapp.com")
        return jsonify({"status": "success", "message": "Driver initialized and navigated to WhatsApp Web"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/inspect_attach', methods=['GET'])
def inspect_attach():
    global driver
    if driver is None:
        return jsonify({"status": "error", "message": "No active driver session"}), 400
    try:
        try:
            attach_btn = driver.find_element(By.XPATH, '//div[@title="Attach"] | //button[@title="Attach"] | //span[@data-icon="plus"] | //span[@data-icon="clip"] | //div[@aria-label="Attach"] | //span[@data-testid="plus"] | //button[@aria-label="Attach"]')
            driver.execute_script("arguments[0].click();", attach_btn)
            time.sleep(2)
        except Exception as e:
            print("Could not click attach button:", e)
            
        inputs = driver.find_elements(By.XPATH, '//input')
        input_details = []
        for inp in inputs:
            try:
                input_details.append({
                    "tag": inp.tag_name,
                    "type": inp.get_attribute("type"),
                    "accept": inp.get_attribute("accept"),
                    "outerHTML": inp.get_attribute("outerHTML")[:250]
                })
            except Exception:
                pass
        return jsonify({"status": "success", "inputs": input_details}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/inspect_menu_items', methods=['GET'])
def inspect_menu_items():
    global driver
    if driver is None:
        return jsonify({"status": "error", "message": "No active driver session"}), 400
    try:
        try:
            attach_btn = driver.find_element(By.XPATH, '//div[@title="Attach"] | //button[@title="Attach"] | //span[@data-icon="plus"] | //span[@data-icon="clip"] | //div[@aria-label="Attach"] | //span[@data-testid="plus"] | //button[@aria-label="Attach"]')
            driver.execute_script("arguments[0].click();", attach_btn)
            time.sleep(2)
        except Exception as e:
            print("Could not click attach button:", e)
            
        elements = driver.find_elements(By.XPATH, '//div[@role="button" or @role="menuitem"] | //button')
        details = []
        for el in elements:
            try:
                text = el.text.strip()
                aria_label = el.get_attribute("aria-label")
                data_testid = el.get_attribute("data-testid")
                outer = el.get_attribute("outerHTML")[:150]
                if text or aria_label or data_testid:
                    details.append({
                        "text": text,
                        "aria_label": aria_label,
                        "data_testid": data_testid,
                        "outerHTML": outer
                    })
            except Exception:
                pass
        return jsonify({"status": "success", "elements": details}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/inspect_media_btn', methods=['GET'])
def inspect_media_btn():
    global driver
    if driver is None:
        return jsonify({"status": "error", "message": "No active driver session"}), 400
    try:
        try:
            attach_btn = driver.find_element(By.XPATH, '//div[@title="Attach"] | //button[@title="Attach"] | //span[@data-icon="plus"] | //span[@data-icon="clip"] | //div[@aria-label="Attach"] | //span[@data-testid="plus"] | //button[@aria-label="Attach"]')
            driver.execute_script("arguments[0].click();", attach_btn)
            time.sleep(2)
        except Exception as e:
            print("Could not click attach button:", e)
            
        media_btn = driver.find_element(By.XPATH, '//button[@aria-label="Media"] | //div[@aria-label="Media"]')
        btn_html = media_btn.get_attribute("outerHTML")
        
        parent = media_btn.find_element(By.XPATH, './ancestor::li | ./ancestor::div | ./..')
        inputs = parent.find_elements(By.XPATH, './/input')
        input_details = []
        for inp in inputs:
            input_details.append({
                "accept": inp.get_attribute("accept"),
                "outerHTML": inp.get_attribute("outerHTML")[:250]
            })
            
        return jsonify({
            "status": "success",
            "btn_html": btn_html,
            "inputs_around": input_details
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/inspect_attach_details', methods=['GET'])
def inspect_attach_details():
    global driver
    if driver is None:
        return jsonify({"status": "error", "message": "No active driver session"}), 400
    try:
        menu_open = False
        try:
            driver.find_element(By.XPATH, '//button[@aria-label="Photos & videos" or @aria-label="Photos &amp; videos"]')
            menu_open = True
        except Exception:
            pass
            
        if not menu_open:
            try:
                attach_btn = driver.find_element(By.XPATH, '//div[@title="Attach"] | //button[@title="Attach"] | //span[@data-icon="plus"] | //span[@data-icon="clip"] | //div[@aria-label="Attach"] | //span[@data-testid="plus"] | //button[@aria-label="Attach"]')
                driver.execute_script("arguments[0].click();", attach_btn)
                time.sleep(2)
            except Exception as e:
                print("Could not click attach button:", e)
                
        buttons = ["Photos & videos", "Document", "New sticker"]
        results = {}
        for btn_name in buttons:
            try:
                btn = driver.find_element(By.XPATH, f'//button[@aria-label="{btn_name}" or @aria-label="{btn_name.replace("&", "&amp;")}"] | //div[@aria-label="{btn_name}"]')
                btn_html = btn.get_attribute("outerHTML")
                
                inputs = btn.find_elements(By.XPATH, './/input')
                inputs_found = [{
                    "accept": inp.get_attribute("accept"),
                    "outerHTML": inp.get_attribute("outerHTML")[:250]
                } for inp in inputs]
                
                parent = btn.find_element(By.XPATH, './..')
                parent_inputs = parent.find_elements(By.XPATH, './/input')
                parent_inputs_found = [{
                    "accept": inp.get_attribute("accept"),
                    "outerHTML": inp.get_attribute("outerHTML")[:250]
                } for inp in parent_inputs]
                
                results[btn_name] = {
                    "btn_html": btn_html[:300],
                    "inputs_inside": inputs_found,
                    "inputs_in_parent": parent_inputs_found
                }
            except Exception as btn_err:
                results[btn_name] = {"error": str(btn_err)}
                
        return jsonify({"status": "success", "results": results}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/inspect_photos_click', methods=['GET'])
def inspect_photos_click():
    global driver
    if driver is None:
        return jsonify({"status": "error", "message": "No active driver session"}), 400
    try:
        try:
            attach_btn = driver.find_element(By.XPATH, '//div[@title="Attach"] | //button[@title="Attach"] | //span[@data-icon="plus"] | //span[@data-icon="clip"] | //div[@aria-label="Attach"] | //span[@data-testid="plus"] | //button[@aria-label="Attach"]')
            driver.execute_script("arguments[0].click();", attach_btn)
            time.sleep(2)
        except Exception as e:
            print("Could not click attach button:", e)
            
        try:
            photos_btn = driver.find_element(By.XPATH, '//button[@aria-label="Photos & videos" or @aria-label="Photos &amp; videos"] | //div[@aria-label="Photos & videos"]')
            driver.execute_script("arguments[0].click();", photos_btn)
            print("Clicked Photos & videos button.")
            time.sleep(2)
        except Exception as e:
            print("Could not click Photos & videos button:", e)
            
        inputs = driver.find_elements(By.XPATH, '//input[@type="file"]')
        input_details = []
        for inp in inputs:
            input_details.append({
                "accept": inp.get_attribute("accept"),
                "outerHTML": inp.get_attribute("outerHTML")[:250]
            })
        return jsonify({"status": "success", "inputs": input_details}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/whatsapp-status', methods=['GET'])
def whatsapp_status():
    global driver
    if driver is None:
        return jsonify({"status": "disconnected", "message": "Browser not launched"}), 200
    try:
        # Check if browser is responsive
        current_url = driver.current_url
    except Exception:
        return jsonify({"status": "disconnected", "message": "Browser crashed or closed"}), 200

    try:
        # Check if QR code is present
        qr_elements = driver.find_elements(By.XPATH, '//canvas[@aria-label="Scan me!"] | //div[@data-ref]')
        if len(qr_elements) > 0:
            return jsonify({"status": "qr_ready", "message": "Waiting for scan"}), 200
        
        # Check if loading spinner/progress bar is present
        progress_elements = driver.find_elements(By.XPATH, '//progress | //div[@role="progressbar"] | //div[contains(text(),"Loading chats")]')
        if len(progress_elements) > 0:
            return jsonify({"status": "syncing", "message": "Logging in and syncing chats..."}), 200

        # Check if main chat interface is present
        chat_box = driver.find_elements(By.XPATH, '//div[@id="side"] | //div[@data-tab="3"] | //header')
        if len(chat_box) > 0:
            return jsonify({"status": "connected", "message": "WhatsApp logged in successfully!"}), 200

        # If none of the above are matched, but browser is loaded, it might be loading or in some transition
        return jsonify({"status": "syncing", "message": "Connecting to WhatsApp..."}), 200
    except Exception as e:
        print(f"[!] whatsapp_status check error: {e}")
        return jsonify({"status": "disconnected", "message": f"Session resetting or busy: {str(e)}"}), 200

@app.route('/api/qr-screenshot', methods=['GET'])
def qr_screenshot():
    global driver
    if driver is None:
        try:
            get_driver()
        except Exception as e:
            return jsonify({"status": "Error", "message": f"Could not launch browser: {str(e)}"}), 500
    
    try:
        # Check if browser is still responsive
        driver.current_url
    except Exception:
        try:
            get_driver()
        except Exception as e:
            return jsonify({"status": "Error", "message": f"Could not relaunch browser: {str(e)}"}), 500

    try:
        temp_qr_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_qr.png")
        
        # Try to locate the QR code element and screenshot only that element (makes it huge and easy to scan!)
        qr_captured = False
        try:
            qr_element = driver.find_element(By.XPATH, '//canvas[@aria-label="Scan me!"] | //div[@data-ref]')
            qr_element.screenshot(temp_qr_path)
            qr_captured = True
            print("[*] Captured cropped QR code element screenshot.")
        except Exception:
            pass
            
        if not qr_captured:
            # Fallback to full page screenshot if element not found yet
            driver.save_screenshot(temp_qr_path)
            print("[*] Captured full page screenshot (QR element not found).")
            
        from flask import send_file
        return send_file(temp_qr_path, mimetype='image/png')
    except Exception as e:
        return jsonify({"status": "Error", "message": f"Failed to capture screenshot: {str(e)}"}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    from flask import send_from_directory
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Initialize database tables before running server
    init_db()
    # Run the server with environment port or default 5002, bound to all network interfaces
    port = int(os.environ.get("PORT", 5002))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)

