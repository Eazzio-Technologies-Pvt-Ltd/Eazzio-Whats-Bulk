import React, { useState, useEffect, useRef } from "react";
import LandingPage from "./components/LandingPage";
import logo from "./assets/logo.png";
import Auth from "./components/Auth";
import ResetPassword from "./components/ResetPassword";
import { 
  ArrowLeft, 
  MessageSquare, 
  Send, 
  Smartphone, 
  Activity, 
  CheckCheck, 
  AlertCircle,
  HelpCircle,
  LogOut,
  Users,
  Settings,
  ShieldCheck,
  History,
  FileText,
  Plus,
  Play,
  Server,
  Upload,
  Clock,
  Pause,
  Trash2,
  User,
  Lock,
  Home,
  MoreVertical,
  Edit2,
  RotateCcw
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("whats_bulk_user") || sessionStorage.getItem("whats_bulk_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [view, setView] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("token")) {
        return "reset-password";
      }
      
      const savedUser = localStorage.getItem("whats_bulk_user") || sessionStorage.getItem("whats_bulk_user");
      if (savedUser) {
        const savedView = localStorage.getItem("whats_bulk_view");
        return savedView || "dashboard";
      }
    } catch (e) {
      console.error(e);
    }
    return "landing";
  }); // "landing", "login", "reset-password", or "dashboard"
  
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem("whats_bulk_active_tab");
      return savedTab || "direct";
    } catch (e) {
      return "direct";
    }
  }); // "direct" or "bulk"

  const handleLaunchApp = () => {
    if (user) {
      setView("dashboard");
    } else {
      setView("login");
    }
  };
  // Direct Messenger State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Idle"); // Idle, Sending..., Success, Error

  // Bulk Campaigns State
  const [directNumbersInput, setDirectNumbersInput] = useState("");
  const [bulkContacts, setBulkContacts] = useState([]); // Array of { name, phone }
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignAttachments, setCampaignAttachments] = useState([]); // Files list
  const [campaignDelay, setCampaignDelay] = useState(10); // delay in seconds
  const [campaignRunning, setCampaignRunning] = useState(false);
  const [campaignPausing, setCampaignPausing] = useState(false);
  const [campaignContacts, setCampaignContacts] = useState([]); // Live state with status: 'pending' | 'sending' | 'success' | 'error'
  const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0);

  // Cute Toast Notification State
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const toastTimeoutRef = useRef(null);

  const showToast = (msg, type = "success") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ show: true, message: msg, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Global State
  const [backendConnected, setBackendConnected] = useState(null); // null (checking), true, false
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("whats_bulk_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // SQLite Saved Contacts State
  const [savedContacts, setSavedContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [saveStatus, setSaveStatus] = useState("Idle");
  const [activeDropdownContactId, setActiveDropdownContactId] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [launchingWhatsapp, setLaunchingWhatsapp] = useState(false);

  const handleLaunchWhatsapp = async () => {
    setLaunchingWhatsapp(true);
    try {
      const res = await fetch("http://localhost:5002/api/launch", {
        method: "POST"
      });
      if (res.ok) {
        showToast("WhatsApp Web opened successfully! 📱", "success");
      } else {
        const data = await res.json();
        showToast(`Error: ${data.message || "Failed to launch"}`, "error");
      }
    } catch (err) {
      showToast("Error: Backend is unreachable", "error");
    } finally {
      setLaunchingWhatsapp(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("whats_bulk_user");
    sessionStorage.removeItem("whats_bulk_user");
    localStorage.removeItem("whats_bulk_view");
    localStorage.removeItem("whats_bulk_active_tab");
    
    setUser(null);
    setView("landing");
    setActiveTab("direct");
    setCampaignRunning(false);
    
    // Clear inputs
    setName("");
    setPhone("");
    setMessage("");
    setStatus("Idle");
    setDirectNumbersInput("");
    setBulkContacts([]);
    setCampaignMessage("");
    setCampaignAttachments([]);
    setCampaignContacts([]);
    setCurrentCampaignIndex(0);
  };

  useEffect(() => {
    try {
      localStorage.setItem("whats_bulk_history", JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [history]);

  // Sync view to localStorage
  useEffect(() => {
    try {
      if (view) {
        localStorage.setItem("whats_bulk_view", view);
      }
    } catch (e) {
      console.error(e);
    }
  }, [view]);

  // Sync activeTab to localStorage
  useEffect(() => {
    try {
      if (activeTab) {
        localStorage.setItem("whats_bulk_active_tab", activeTab);
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

  // Prompt confirmation on refresh/close if form fields are filled
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const isDirectFieldsFilled = name.trim() || phone.trim() || message.trim();
      const isBulkFieldsFilled = directNumbersInput.trim() || campaignMessage.trim() || campaignAttachments.length > 0;
      const isContactFieldsFilled = newContactName.trim() || newContactPhone.trim();

      if (isDirectFieldsFilled || isBulkFieldsFilled || isContactFieldsFilled) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to refresh? All fields will be cleared and your session will reset.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [name, phone, message, directNumbersInput, campaignMessage, campaignAttachments, newContactName, newContactPhone]);

  const fetchSavedContacts = async (query = "") => {
    if (!user || !user.id) return;
    try {
      const url = query.trim() 
        ? `http://localhost:5002/api/contacts/search?q=${encodeURIComponent(query)}`
        : "http://localhost:5002/api/contacts";
      const res = await fetch(url, {
        headers: {
          "X-User-Id": user.id.toString()
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedContacts(data);
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  };

  useEffect(() => {
    if (view === "dashboard" && user) {
      fetchSavedContacts(searchQuery);
    }
  }, [view, searchQuery, user]);

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!user || !user.id) return;
    if (savedContacts.length >= 1000) {
      setSaveStatus("Error: Limit reached (max 1000)!");
      alert("Limit reached: You cannot save more than 1000 contacts in the directory. Please delete some contacts to add new ones.");
      return;
    }
    if (!newContactName.trim() || !newContactPhone.trim()) {
      setSaveStatus("Error: Name and Phone are required!");
      return;
    }
    setSaveStatus("Saving...");
    try {
      const res = await fetch("http://localhost:5002/api/contacts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": user.id.toString()
        },
        body: JSON.stringify({ name: newContactName, phone: newContactPhone })
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus("Success!");
        setNewContactName("");
        setNewContactPhone("");
        fetchSavedContacts(searchQuery);
        setTimeout(() => setSaveStatus("Idle"), 3000);
      } else {
        setSaveStatus(`Error: ${data.message || "Failed to save"}`);
      }
    } catch (err) {
      setSaveStatus("Error: Backend unreachable");
    }
  };

  const handleDeleteContact = async (id) => {
    if (!user || !user.id) return;
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`http://localhost:5002/api/contacts/${id}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": user.id.toString()
        }
      });
      if (res.ok) {
        fetchSavedContacts(searchQuery);
      } else {
        alert("Failed to delete contact.");
      }
    } catch (err) {
      console.error("Error deleting contact:", err);
    }
  };

  const handleSelectForDirect = (contact) => {
    setName(contact.name);
    setPhone(contact.phone);
    setActiveTab("direct");
  };

  const handleAddToBulk = (contact) => {
    let alreadyExists = false;
    setBulkContacts(prev => {
      if (prev.some(c => c.phone === contact.phone)) {
        alreadyExists = true;
        return prev;
      }
      const updated = [...prev, { name: contact.name, phone: contact.phone }];
      setDirectNumbersInput(updated.map(c => `${c.name}:${c.phone}`).join('\n'));
      return updated;
    });

    if (alreadyExists) {
      showToast(`${contact.name} is already added!`, "warning");
    } else {
      showToast(`${contact.name} added to campaign! 🌟`, "success");
    }
  };

  const handleRemoveFromBulk = (contact) => {
    setBulkContacts(prev => {
      const updated = prev.filter(c => c.phone !== contact.phone);
      setDirectNumbersInput(updated.map(c => `${c.name}:${c.phone}`).join('\n'));
      return updated;
    });
    showToast(`${contact.name} removed from campaign! 🗑️`, "info");
  };

  // Campaign ref for loop pausing/canceling
  const campaignRunningRef = useRef(campaignRunning);
  useEffect(() => {
    campaignRunningRef.current = campaignRunning;
  }, [campaignRunning]);

  // Check backend server status periodically when on the dashboard
  useEffect(() => {
    if (view !== "dashboard") return;

    const checkBackend = async () => {
      try {
        const response = await fetch("http://localhost:5002/api/health");
        if (response.ok) {
          setBackendConnected(true);
        } else {
          setBackendConnected(false);
        }
      } catch (err) {
        setBackendConnected(false);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, [view]);

  // Direct Message Sending handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatus("Error: Name field cannot be empty!");
      return;
    }
    if (!phone.trim()) {
      setStatus("Error: Phone number cannot be empty!");
      return;
    }
    if (!message.trim()) {
      setStatus("Error: Message body cannot be empty!");
      return;
    }

    setStatus("Sending...");
    
    try {
      const response = await fetch("http://localhost:5002/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone,
          message: message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`Success: Message successfully sent to ${name} (${phone})!`);
        setHistory(prev => [
          {
            id: Date.now(),
            name,
            phone,
            status: "Success",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...prev
        ]);
        setName("");
        setPhone("");
        setMessage("");
      } else {
        setStatus(`Error: ${data.message || "Failed to send message"}`);
        setHistory(prev => [
          {
            id: Date.now(),
            name,
            phone,
            status: "Error",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...prev
        ]);
      }
    } catch (error) {
      console.error(error);
      setStatus("Error: Backend server is not running or unreachable");
      setHistory(prev => [
        {
          id: Date.now(),
          name,
          phone,
          status: "Error",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...prev
      ]);
    }
  };

  // Bulk Campaign Numbers Parsing
  const handleDirectNumbersChange = (val) => {
    setDirectNumbersInput(val);
    let parsed = val.split(/[,\n]/)
      .map(n => n.trim())
      .filter(n => n.length > 0)
      .map((num, idx) => {
        // If entry contains a name/number format like Name:Number or Name,Number
        const parts = num.split(/[;:]/);
        if (parts.length >= 2) {
          return { name: parts[0].trim(), phone: parts[1].trim() };
        }
        return { name: `Contact ${idx + 1}`, phone: num };
      });
    
    if (parsed.length > 1000) {
      alert("Limit reached: You can enter a maximum of 1000 contacts for a campaign. The list has been truncated to the first 1000 contacts.");
      parsed = parsed.slice(0, 1000);
      // Re-generate directNumbersInput text for the truncated list
      const truncatedText = parsed.map(c => `${c.name}:${c.phone}`).join('\n');
      setDirectNumbersInput(truncatedText);
    }
    setBulkContacts(parsed);
  };

  // CSV/Text File Upload Parsing
  const handleContactsFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      let parsedContacts = [];

      if (lines.length > 0 && lines[0].includes(',')) {
        // CSV Parsing
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
        const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('number') || h.includes('mobile') || h.includes('contact'));
        const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('first') || h.includes('user'));

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/["']/g, ''));
          if (cols.length > 0 && cols.some(c => c.length > 0)) {
            let phone = phoneIndex !== -1 && cols[phoneIndex] ? cols[phoneIndex] : cols[0];
            let name = nameIndex !== -1 && cols[nameIndex] ? cols[nameIndex] : `Contact ${i}`;
            if (phone) {
              parsedContacts.push({ name, phone });
            }
          }
        }
      } else {
        // Simple list (one per line)
        lines.forEach((line, idx) => {
          const parts = line.split(/[,\t|]/);
          if (parts.length >= 2) {
            parsedContacts.push({ name: parts[0].trim(), phone: parts[1].trim() });
          } else {
            parsedContacts.push({ name: `Contact ${idx + 1}`, phone: line.trim() });
          }
        });
      }

      if (parsedContacts.length > 1000) {
        alert("Limit reached: CSV file contains more than 1000 contacts. Only the first 1000 contacts have been imported.");
        parsedContacts = parsedContacts.slice(0, 1000);
      }

      if (parsedContacts.length > 0) {
        setBulkContacts(parsedContacts);
        setDirectNumbersInput(parsedContacts.map(c => `${c.name}:${c.phone}`).join('\n'));
      }
    };
    reader.readAsText(file);
    if (e.target) {
      e.target.value = null; // Reset input field to allow re-uploading same file
    }
  };

  // Attachment Handler
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setCampaignAttachments(prev => [...prev, ...selectedFiles]);
  };

  const removeAttachment = (index) => {
    setCampaignAttachments(prev => prev.filter((_, idx) => idx !== index));
  };

  // Start Bulk Campaign
  const handleStartCampaign = async () => {
    if (bulkContacts.length === 0) {
      alert("Please add at least one recipient number.");
      return;
    }
    if (bulkContacts.length > 1000) {
      alert("Limit exceeded: Bulk campaigns are limited to a maximum of 1000 contacts per campaign.");
      return;
    }
    if (!campaignMessage.trim() && campaignAttachments.length === 0) {
      alert("Please enter a campaign message or select at least one attachment file.");
      return;
    }

    // Check if there is an active paused campaign
    const pendingCount = campaignContacts.filter(c => c.status === "pending" || c.status === "sending").length;
    if (campaignContacts.length > 0 && pendingCount > 0) {
      if (!window.confirm("You have a paused campaign. Starting a new campaign will discard the current progress. Do you want to continue?")) {
        return;
      }
    }

    // Initialize campaign run state
    const initialContacts = bulkContacts.map(c => ({
      ...c,
      status: "pending",
      errorMsg: ""
    }));
    setCampaignContacts(initialContacts);
    setCampaignRunning(true);
    campaignRunningRef.current = true;
    setCurrentCampaignIndex(0);

    // Call runner
    setTimeout(() => {
      runBulkCampaignLoop(initialContacts);
    }, 500);
  };

  const runBulkCampaignLoop = async (contactsToRun, startIndex = 0) => {
    let updatedContacts = [...contactsToRun];

    try {
      for (let i = startIndex; i < updatedContacts.length; i++) {
        if (!campaignRunningRef.current) {
          break;
        }

        updatedContacts[i].status = "sending";
        setCampaignContacts([...updatedContacts]);
        setCurrentCampaignIndex(i);

        const contact = updatedContacts[i];
        const personalizedMsg = campaignMessage.replace(/{{Name}}/g, contact.name);

        // Construct Multipart Form Data for attachments support
        const formData = new FormData();
        formData.append("phone", contact.phone);
        formData.append("message", personalizedMsg);
        campaignAttachments.forEach(file => {
          formData.append("attachments", file);
        });

        try {
          const response = await fetch("http://localhost:5002/api/send", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (response.ok) {
            updatedContacts[i].status = "success";
            setHistory(prev => [
              {
                id: Date.now() + i,
                name: contact.name,
                phone: contact.phone,
                status: "Success",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              ...prev
            ]);
          } else {
            updatedContacts[i].status = "error";
            updatedContacts[i].errorMsg = data.message || "Failed to deliver";
            setHistory(prev => [
              {
                id: Date.now() + i,
                name: contact.name,
                phone: contact.phone,
                status: "Error",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              },
              ...prev
            ]);
          }
        } catch (err) {
          console.error(err);
          updatedContacts[i].status = "error";
          updatedContacts[i].errorMsg = "Server unreachable";
          setHistory(prev => [
            {
              id: Date.now() + i,
              name: contact.name,
              phone: contact.phone,
              status: "Error",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
            ...prev
          ]);
        }

        setCampaignContacts([...updatedContacts]);

        // Interruptible delay between messages
        if (i < updatedContacts.length - 1 && campaignRunningRef.current) {
          const delaySeconds = campaignDelay;
          const intervalMs = 100;
          const totalMs = delaySeconds * 1000;
          let elapsed = 0;
          while (elapsed < totalMs && campaignRunningRef.current) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            elapsed += intervalMs;
          }
        }
      }
    } finally {
      setCampaignRunning(false);
      setCampaignPausing(false);
    }
  };

  const handlePauseCampaign = () => {
    campaignRunningRef.current = false;
    setCampaignPausing(true);
  };

  const handleResumeCampaign = () => {
    const firstPendingIndex = campaignContacts.findIndex(c => c.status === "pending" || c.status === "sending");
    const startIndex = firstPendingIndex !== -1 ? firstPendingIndex : 0;

    // Reset status of "sending" to "pending" to retry/continue
    const updated = campaignContacts.map((c, idx) => {
      if (idx >= startIndex) {
        return { ...c, status: "pending", errorMsg: "" };
      }
      return c;
    });

    setCampaignContacts(updated);
    setCampaignRunning(true);
    campaignRunningRef.current = true;
    setCampaignPausing(false);
    setCurrentCampaignIndex(startIndex);

    setTimeout(() => {
      runBulkCampaignLoop(updated, startIndex);
    }, 500);
  };

  const handleRestartCampaign = () => {
    const resetContacts = campaignContacts.map(c => ({
      ...c,
      status: "pending",
      errorMsg: ""
    }));

    setCampaignContacts(resetContacts);
    setCampaignRunning(true);
    campaignRunningRef.current = true;
    setCampaignPausing(false);
    setCurrentCampaignIndex(0);

    setTimeout(() => {
      runBulkCampaignLoop(resetContacts, 0);
    }, 500);
  };

  const handleResetCampaignConsole = () => {
    if (window.confirm("Are you sure you want to reset the campaign progress console?")) {
      setCampaignContacts([]);
      setCurrentCampaignIndex(0);
      setCampaignPausing(false);
    }
  };

  const populateTemplate = (templateText, isBulk = false) => {
    if (isBulk) {
      setCampaignMessage(templateText);
    } else {
      setMessage(templateText);
    }
  };

  if (view === "landing") {
    return <LandingPage onLaunchApp={handleLaunchApp} />;
  }

  if (view === "reset-password") {
    return (
      <ResetPassword 
        onBackToLogin={() => setView("login")}
        onBackToLanding={() => setView("landing")}
      />
    );
  }

  if (view === "login") {
    return (
      <Auth 
        onAuthSuccess={(userData, rememberMe) => {
          if (rememberMe) {
            localStorage.setItem("whats_bulk_user", JSON.stringify(userData));
          } else {
            sessionStorage.setItem("whats_bulk_user", JSON.stringify(userData));
          }
          setUser(userData);
          setView("dashboard");
        }}
        onBackToLanding={() => setView("landing")}
      />
    );
  }

  // Campaign Metrics Calculator
  const totalContactsCount = campaignContacts.length;
  const sentSuccessCount = campaignContacts.filter(c => c.status === "success").length;
  const sentFailedCount = campaignContacts.filter(c => c.status === "error").length;
  const pendingCount = campaignContacts.filter(c => c.status === "pending").length;
  const sendingCount = campaignContacts.filter(c => c.status === "sending").length;
  const progressPercent = totalContactsCount > 0 ? Math.round(((sentSuccessCount + sentFailedCount) / totalContactsCount) * 100) : 0;

  return (
    <div className="min-h-screen md:h-screen text-slate-900 bg-slate-50 flex flex-col md:flex-row relative overflow-hidden">
      
      {/* Background ambient glowing blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/3 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/3 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col justify-between z-10 md:overflow-y-auto shrink-0">
        <div className="space-y-8">
          {/* Logo / Branding */}
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Whats-Bulk Logo" className="w-9 h-9 object-contain" />
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Whats-Bulk</span>
              <span className="text-[9px] block font-mono text-emerald-650 -mt-1 font-semibold">CONSOLE</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <button 
              onClick={() => { setView("landing"); setCampaignRunning(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all border text-slate-600 hover:bg-slate-100/50 border-transparent"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button 
              onClick={() => { setActiveTab("direct"); setCampaignRunning(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
                activeTab === "direct" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100/50 border-transparent"
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Direct Messenger</span>
            </button>
            
            <button 
              onClick={() => setActiveTab("bulk")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
                activeTab === "bulk" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100/50 border-transparent"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Bulk Campaigns</span>
            </button>

            <button 
              onClick={() => { setActiveTab("contacts"); setCampaignRunning(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
                activeTab === "contacts" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100/50 border-transparent"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Saved Directory</span>
            </button>

            <button 
              onClick={() => { setActiveTab("settings"); setCampaignRunning(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
                activeTab === "settings" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100/50 border-transparent"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Profile & Settings</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-slate-200 space-y-3 mt-6">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-100/60 text-slate-650 hover:text-slate-900 transition-colors text-sm font-semibold"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      {activeTab === "direct" && (
        <main className="flex-1 p-6 md:p-10 overflow-y-auto z-10 max-w-7xl mx-auto w-full space-y-8">
          {/* Main Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Direct Messenger 🚀
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Draft messages, input contact credentials, and trigger WhatsApp delivery instantly.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleLaunchWhatsapp}
                disabled={launchingWhatsapp}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white font-extrabold rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/10 text-xs shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{launchingWhatsapp ? "Launching..." : "Launch WhatsApp Web"}</span>
              </button>
            </div>
          </div>

          {/* Direct Messenger Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Panel: Composer Form */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-6 md:p-8 rounded-2xl space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-805">Broadcast Composer</h2>
                <span className="text-[10px] bg-emerald-50 px-2 py-1 rounded text-emerald-700 border border-emerald-200 font-bold uppercase tracking-wider">Active Profile</span>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Amit Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-650 focus:ring-1 focus:ring-emerald-655 outline-none transition-all text-lg text-slate-900 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., +919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-655 focus:ring-1 focus:ring-emerald-655 outline-none transition-all text-lg font-mono text-slate-900 placeholder-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-605 uppercase tracking-widest block">Quick Templates</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      type="button"
                      onClick={() => populateTemplate("Hello! Just a reminder that your appointment is scheduled for tomorrow at 10:00 AM. Thank you!")}
                      className="bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-[11px] text-slate-650 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      📅 Appointment
                    </button>
                    <button 
                      type="button"
                      onClick={() => populateTemplate("Hey there! ⚡ We noticed you left items in your cart. Use checkout code SAVE10 for 10% off.")}
                      className="bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-[11px] text-slate-655 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      🛒 Abandoned Cart
                    </button>
                    <button 
                      type="button"
                      onClick={() => populateTemplate("Hi! Thank you for choosing us. We would love to hear your feedback. Tap here to leave a review: bit.ly/review")}
                      className="bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-[11px] text-slate-655 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      ⭐ Review Request
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Message Text
                  </label>
                  <textarea
                    placeholder="Type your WhatsApp notification body here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-36 p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-655 focus:ring-1 focus:ring-emerald-655 outline-none transition-all text-lg text-slate-900 placeholder-slate-400 resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Status Indicator
                  </label>
                  <div className={`p-3.5 rounded-xl border text-xs font-medium transition-all duration-300 ${
                    status.startsWith("Success") 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : status.startsWith("Error")
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : status === "Sending..."
                      ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        status.startsWith("Success") ? "bg-emerald-500 animate-pulse" :
                        status.startsWith("Error") ? "bg-rose-600" :
                        status === "Sending..." ? "bg-amber-500 animate-ping" :
                        "bg-slate-400"
                      }`}></span>
                      <span>{status}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === "Sending..."}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/10 mt-2 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  Send WhatsApp Message
                </button>
              </form>
            </div>

            {/* Right Panel: Live Device Preview & History Log */}
            <div className="lg:col-span-5 space-y-8">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Live Render Preview</span>
                
                <div className="bg-[#efeae2] rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                  <div className="bg-slate-100 border-b border-slate-250 px-3.5 py-2.5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <div className="text-[10px] font-semibold text-slate-805">{name.trim() || "Recipient Preview"}</div>
                    <span className="text-[8px] text-slate-500 ml-auto font-mono">WhatsApp Render</span>
                  </div>

                  <div className="p-4 min-h-[140px] flex items-end">
                    {message.trim() ? (
                      <div className="bg-[#d9fdd3] text-slate-900 p-2.5 rounded-2xl rounded-tr-none self-end max-w-[90%] shadow-sm">
                        <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{message}</p>
                        <div className="text-[8px] text-slate-500 mt-1 text-right flex items-center justify-end gap-0.5 font-medium">
                          <span>12:00 PM</span>
                          <CheckCheck className="w-3.5 h-3.5 text-sky-500 stroke-[2.5]" />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center w-full text-slate-500 text-xs py-10 font-medium">
                        Start writing your message in the composer to view live preview rendering.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* History Log */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-emerald-600" />
                    Recent Delivery Logs
                  </span>
                  <button 
                    onClick={() => setHistory([])}
                    className="text-[10px] text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Clear Logs
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                  {history.length > 0 ? (
                    history.map((log) => (
                      <div key={log.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800">{log.name}</div>
                          <div className="text-xs text-slate-555 font-mono">{log.phone}</div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            log.status === "Success" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {log.status === "Success" ? <CheckCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {log.status}
                          </span>
                          <div className="text-[8px] text-slate-550 mt-1 font-medium">{log.time}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-500 font-medium">
                      No broadcast logs available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {activeTab === "bulk" && (
        /* Bulk Campaign Workspace Tab */
        <main className="flex-1 p-6 md:p-10 overflow-y-auto z-10 max-w-7xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Bulk Campaign Manager 📣
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Upload contact files, write templates with personalization variables, attach folder/files, and broadcast safely.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
              <button
                onClick={handleLaunchWhatsapp}
                disabled={launchingWhatsapp}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white font-extrabold rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/10 text-xs shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{launchingWhatsapp ? "Launching..." : "Launch WhatsApp Web"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Side: Setup & Configuration */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-6 md:p-8 rounded-2xl space-y-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-850">Campaign Configuration</h2>

              {/* Step 1: Bulk Numbers Input */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Recipient Numbers List
                  </label>
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {bulkContacts.length} / 1000 Contacts Parsed
                  </span>
                </div>

                {/* Direct text area input */}
                  <textarea
                    placeholder="Add or paste numbers here..."
                    value={directNumbersInput}
                    onChange={(e) => handleDirectNumbersChange(e.target.value)}
                    className="w-full h-28 p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-655 focus:ring-1 focus:ring-emerald-655 outline-none transition-all text-lg font-mono text-slate-900 placeholder-slate-400 resize-none leading-relaxed"
                  />
                  <p className="text-xs font-semibold text-amber-600 -mt-2">
                    ⚠️ Limit: Max 1000 contacts per campaign.
                  </p>

                {/* CSV File Drag & Drop Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-center items-center text-center relative hover:border-emerald-500 transition-colors">
                    <Upload className="w-5 h-5 text-slate-450 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">Import CSV / TXT List</span>
                    <input 
                      type="file" 
                      accept=".csv,.txt"
                      onChange={handleContactsFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  <div className="text-xs text-slate-500 flex flex-col justify-center space-y-1">
                    <p className="font-semibold text-slate-600">💡 Tip: Format your CSV columns as:</p>
                    <code className="bg-slate-100 p-1.5 rounded block text-[11px] font-mono">"Name, Phone"</code>
                    <p>Dynamic variable <code className="text-emerald-700 font-mono text-[11px]">{"{{Name}}"}</code> parses name column automatically.</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Message Composer */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Campaign Message Template
                  </label>
                </div>

                <textarea
                  placeholder="Type message."
                  value={campaignMessage}
                  onChange={(e) => setCampaignMessage(e.target.value)}
                  className="w-full h-32 p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-655 focus:ring-1 focus:ring-emerald-655 outline-none transition-all text-lg text-slate-900 placeholder-slate-400 resize-none leading-relaxed"
                />

                {/* Bulk Templates Populator */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">Quick Templates</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      onClick={() => populateTemplate("Hello {{Name}}! 🌟 Your customized bill for this month is ready. Please view and clear: bit.ly/bills", true)}
                      className="bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-[11px] text-slate-650 px-2 py-1 rounded-lg"
                    >
                      💳 Payment Link
                    </button>
                    <button 
                      onClick={() => populateTemplate("Hi {{Name}}, 📦 order #9284 has been successfully dispatched and will reach you by tomorrow. Track: bit.ly/status", true)}
                      className="bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-[11px] text-slate-650 px-2 py-1 rounded-lg"
                    >
                      🚚 Shipping Track
                    </button>
                    <button 
                      onClick={() => populateTemplate("Hey {{Name}}! ⚡ Thank you for shopping. Here is your coupon code: DISCOUNT20 for your next purchase!", true)}
                      className="bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-[11px] text-slate-650 px-2 py-1 rounded-lg"
                    >
                      🎟️ Promo Code
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: Attachments / Files Folder option */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Attachment Folder / Media Files
                </label>

                <div className="relative">
                  <input 
                    type="file" 
                    multiple 
                    id="bulk-attachments"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-600 rounded-xl p-5 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                    <span className="text-xs font-bold text-slate-700">Attach Media Files / Documents</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Images, PDFs, media sheets (Will upload and attach dynamically)</span>
                  </div>
                </div>

                {/* Attachments List */}
                {campaignAttachments.length > 0 && (
                  <div className="space-y-1.5 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Attached Files ({campaignAttachments.length}):</span>
                    {campaignAttachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-white border border-slate-150 rounded-lg text-[11px]">
                        <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                          <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-slate-800 truncate">{file.name}</span>
                          <span className="text-slate-550 text-[9px]">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button 
                          onClick={() => removeAttachment(idx)}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 4: Delays Settings (Anti-Ban Safeguards) */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-650" />
                  Anti-Ban Delay Configuration
                </h4>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-[10px] text-slate-600 max-w-sm">
                    Staggered delay introduces pause intervals between messages. Organic typing delay mimics natural chat behavior to protect your WhatsApp account.
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <input 
                      type="number" 
                      min="5"
                      max="120"
                      value={campaignDelay}
                      onChange={(e) => setCampaignDelay(Number(e.target.value))}
                      className="w-16 p-1.5 text-sm text-center border border-slate-200 rounded-lg focus:border-emerald-600 bg-white font-semibold text-slate-855 outline-none"
                    />
                    <span className="text-xs text-slate-500 font-medium">sec delay</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleStartCampaign}
                  disabled={campaignRunning}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 stroke-[2.5]" />
                  Launch Bulk Campaign
                </button>
              </div>
            </div>

            {/* Right Side: Live Progress Monitor Console */}
            <div className="lg:col-span-5 space-y-8">
              
              {/* Campaign Status Card */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Campaign Progress Console</h3>

                {/* Progress bar container */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Delivery Status</span>
                    <span>{progressPercent}% Complete</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <div className="text-xl font-extrabold text-slate-800">{totalContactsCount}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total Targets</div>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-center">
                    <div className="text-xl font-extrabold text-emerald-700">{sentSuccessCount}</div>
                    <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Successful</div>
                  </div>
                  <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-center">
                    <div className="text-xl font-extrabold text-rose-700">{sentFailedCount}</div>
                    <div className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">Failed</div>
                  </div>
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-center">
                    <div className="text-xl font-extrabold text-amber-700">{pendingCount}</div>
                    <div className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Pending</div>
                  </div>
                </div>

                {/* Live Action Buttons */}
                {campaignRunning && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      <span className="text-xs text-amber-800 font-semibold">
                        {campaignPausing 
                          ? "Pausing campaign after current message..."
                          : `Sending target ${currentCampaignIndex + 1} of ${totalContactsCount}...`
                        }
                      </span>
                    </div>
                    <button 
                      onClick={handlePauseCampaign}
                      disabled={campaignPausing}
                      className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold shadow-sm transition-all"
                    >
                      <Pause className="w-3.5 h-3.5" /> {campaignPausing ? "Pausing..." : "Pause"}
                    </button>
                  </div>
                )}

                {!campaignRunning && totalContactsCount > 0 && pendingCount > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span className="text-xs text-amber-800 font-bold">
                        Campaign Paused ({pendingCount} contacts pending)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleResumeCampaign}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 font-bold shadow-sm transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Resume
                      </button>
                      <button 
                        onClick={handleRestartCampaign}
                        className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 font-bold shadow-sm transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restart
                      </button>
                    </div>
                  </div>
                )}

                {!campaignRunning && totalContactsCount > 0 && pendingCount === 0 && (
                  <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs text-emerald-800 font-bold">
                        Campaign Completed Successfully! 🎉
                      </span>
                    </div>
                    <button 
                      onClick={handleResetCampaignConsole}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 font-bold border border-slate-300 transition-all"
                    >
                      Clear Progress Console
                    </button>
                  </div>
                )}
              </div>

              {/* Contacts Live Delivery Logs Status */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Live Broadcast Queue</span>

                <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin">
                  {campaignContacts.length > 0 ? (
                    campaignContacts.map((contact, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-sm transition-all">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {contact.name}
                            {idx === currentCampaignIndex && campaignRunning && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{contact.phone}</div>
                        </div>

                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            contact.status === "success" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : contact.status === "error"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : contact.status === "sending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {contact.status === "success" ? <CheckCheck className="w-3.5 h-3.5" /> : 
                             contact.status === "error" ? <AlertCircle className="w-3.5 h-3.5" /> :
                             contact.status === "sending" ? <Activity className="w-3.5 h-3.5" /> : 
                             null}
                            {contact.status}
                          </span>
                          {contact.status === "error" && contact.errorMsg && (
                            <span className="block text-[8px] text-rose-500 mt-0.5 text-right font-medium">{contact.errorMsg}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-xs text-slate-400 font-medium">
                      Setup contacts list on the left to activate queue monitor.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </main>
      )}

      {activeTab === "contacts" && (
        <main className="flex-1 p-6 md:p-10 overflow-y-auto z-10 max-w-7xl mx-auto w-full space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Saved Contacts Directory 📇
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Manage your persistent SQLite contact list, search records instantly, and assign them directly to campaigns.
              </p>
            </div>
            <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm">
              Saved Records: <span className="text-emerald-600">{savedContacts.length} / 1000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Add New Contact Form */}
            <div className="lg:col-span-4 bg-white border border-slate-200 p-6 rounded-2xl space-y-6 shadow-sm">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-800">Add New Contact</h2>
                <span className="text-xs text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-250 shadow-sm">
                  {savedContacts.length} / 1000 Limit
                </span>
              </div>
              
              <form onSubmit={handleSaveContact} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="Rahul Verma"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-250 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-base text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-250 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-base text-slate-900"
                  />
                </div>

                {saveStatus !== "Idle" && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${
                    saveStatus.startsWith("Success") 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                      : saveStatus.startsWith("Error")
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-slate-50 text-slate-500 border border-slate-200"
                  }`}>
                    {saveStatus}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Save Contact
                </button>
              </form>
            </div>

            {/* Right Column: Search and Directory Table */}
            <div className="lg:col-span-8 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <h2 className="text-base font-bold text-slate-800">Directory Records</h2>
                
                {/* Search Input */}
                <div className="relative max-w-xs w-full">
                  <input
                    type="text"
                    placeholder="Search by name or number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-xs"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 text-xs font-bold font-mono"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Contacts Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                        <th className="p-3.5">Name</th>
                        <th className="p-3.5">Phone</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {savedContacts.length > 0 ? (
                        savedContacts.map((contact) => {
                          const isInBulk = bulkContacts.some(c => c.phone === contact.phone);
                          return (
                            <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3.5 font-semibold text-slate-800">{contact.name}</td>
                              <td className="p-3.5 font-mono text-slate-600">{contact.phone}</td>
                              <td className="p-3.5 text-right flex items-center justify-end gap-3">
                                {isInBulk ? (
                                  <button
                                    onClick={() => handleRemoveFromBulk(contact)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg font-bold transition-all text-xs w-32 text-center"
                                    title="Remove from Bulk Queue"
                                  >
                                    Remove from Bulk
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAddToBulk(contact)}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold transition-all text-xs w-32 text-center"
                                    title="Add to Bulk Queue"
                                  >
                                    Add to Bulk
                                  </button>
                                )}
                                
                                <div className="relative inline-block text-left">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdownContactId(prev => prev === contact.id ? null : contact.id);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors border border-transparent"
                                    title="More Options"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  {activeDropdownContactId === contact.id && (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-20" 
                                        onClick={() => setActiveDropdownContactId(null)}
                                      ></div>
                                      <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 text-left origin-top-right transition-all">
                                        <button
                                          onClick={() => {
                                            handleSelectForDirect(contact);
                                            setActiveDropdownContactId(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-2"
                                        >
                                          <Send className="w-3.5 h-3.5 text-slate-400" />
                                          <span>Send Direct</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingContact({ ...contact });
                                            setActiveDropdownContactId(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-2"
                                        >
                                          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                          <span>Edit Contact</span>
                                        </button>
                                        <div className="border-t border-slate-100 my-1"></div>
                                        <button
                                          onClick={() => {
                                            handleDeleteContact(contact.id);
                                            setActiveDropdownContactId(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-2"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                          <span>Delete</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="3" className="text-center p-8 text-slate-450 font-medium">
                            No saved contacts found. Add some contacts or check your search filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

          {/* Edit Contact Modal */}
          {editingContact && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Edit Contact</h3>
                  <button 
                    onClick={() => setEditingContact(null)}
                    className="text-slate-400 hover:text-slate-600 font-mono text-xl font-bold p-1"
                  >
                    ×
                  </button>
                </div>

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!editingContact.name.trim() || !editingContact.phone.trim()) {
                      alert("Name and Phone number are required!");
                      return;
                    }
                    try {
                      const res = await fetch(`http://localhost:5002/api/contacts/${editingContact.id}`, {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                          "X-User-Id": user.id.toString()
                        },
                        body: JSON.stringify({
                          name: editingContact.name,
                          phone: editingContact.phone
                        })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        showToast("Contact updated successfully! 📝", "success");
                        setEditingContact(null);
                        fetchSavedContacts(searchQuery);
                      } else {
                        alert(data.message || "Failed to update contact");
                      }
                    } catch (err) {
                      alert("Error: Backend is unreachable");
                    }
                  }} 
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={editingContact.name}
                      onChange={(e) => setEditingContact(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-250 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-base text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editingContact.phone}
                      onChange={(e) => setEditingContact(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-250 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-base text-slate-900"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingContact(null)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/10"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      )}

      {activeTab === "settings" && (
        <main className="flex-1 p-6 md:p-10 overflow-y-auto z-10 max-w-7xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Profile & Settings ⚙️
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                View your logged-in user profile, system configurations, and account status.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Card: Profile Details */}
            <div className="lg:col-span-5 bg-white border border-slate-200 p-6 md:p-8 rounded-2xl space-y-6 shadow-sm">
              <div className="flex flex-col items-center text-center space-y-4">
                {/* User Avatar */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-500/20 select-none">
                  {user?.email ? user.email.charAt(0).toUpperCase() : <User className="w-10 h-10" />}
                </div>
                
                <div>
                  <h2 className="text-xl font-bold text-slate-805">{user?.email ? user.email.split('@')[0] : "Admin"}</h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Administrator Profile
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Account ID</span>
                  <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">USR-{user?.id || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Login Email</span>
                  <span className="font-medium text-slate-700">{user?.email || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Access Level</span>
                  <span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Superuser / Admin</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5">
                  <span className="font-semibold text-slate-500">Session Status</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active Session
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card: Preferences & Actions */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-6 md:p-8 rounded-2xl space-y-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800">System Preferences</h3>
              
              <div className="space-y-4">
                {/* SMTP / Mail server notice or configs */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-700">Backend Server Info</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    All operations are processed through the backend server running locally on <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-semibold">http://localhost:5002</code>. Database storage uses SQLite.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to sign out and clear your session?")) {
                        handleLogout();
                      }
                    }}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-3 rounded-xl border border-rose-200 transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out & Clear Session
                  </button>

                  <button 
                    onClick={() => {
                      setView("reset-password");
                    }}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl border border-slate-200 transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-slate-500" />
                    Reset Account Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Cute Top-Centered Toast Notification */}
      <div 
        style={{
          transform: `translate(-50%, ${toast.show ? '0' : '-20px'}) scale(${toast.show ? '1' : '0.95'})`,
          transition: 'all 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        className={`fixed top-6 left-1/2 z-[100] flex items-center gap-4.5 p-5 rounded-3xl shadow-2xl border-2 backdrop-blur-lg w-[360px] md:w-[400px] ${
          toast.show 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        } ${
          toast.type === "success"
            ? "bg-white/98 text-slate-800 border-emerald-300 shadow-emerald-500/10"
            : "bg-white/98 text-slate-800 border-amber-300 shadow-amber-500/10"
        }`}
      >
        <div className={`flex items-center justify-center w-12 h-12 rounded-full shrink-0 shadow-inner ${
          toast.type === "success" ? "bg-emerald-100 text-emerald-600 animate-bounce" : "bg-amber-100 text-amber-600"
        }`}>
          {toast.type === "success" ? (
            <CheckCheck className="w-6 h-6" />
          ) : (
            <AlertCircle className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-extrabold text-slate-900 leading-tight">{toast.message}</p>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Bulk Campaign Queue</p>
        </div>
      </div>

    </div>
  );
}