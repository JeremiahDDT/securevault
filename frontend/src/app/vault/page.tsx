"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { vaultApi, authApi } from "@/lib/api";

type VaultEntry = {
  id: string;
  title: string;
  type: "note" | "credential" | "card";
  content: string;
  updatedAt: string;
};

const TYPE_ICONS = { note: "📝", credential: "🔑", card: "💳" };
const TYPE_LABELS = { note: "Note", credential: "Credential", card: "Card" };

export default function VaultPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<VaultEntry | null>(null);
  const [form, setForm] = useState({ title: "", content: "", type: "credential" });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const { data } = await vaultApi.getEntries();
      setEntries(data.entries);
    } catch (err: any) {
    console.error("Vault fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError("");
    try {
      if (selected) {
        await vaultApi.updateEntry(selected.id, form as any);
      } else {
        await vaultApi.createEntry(form as any);
      }
      setShowForm(false);
      setSelected(null);
      setForm({ title: "", content: "", type: "credential" });
      fetchEntries();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save entry.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    await vaultApi.deleteEntry(id);
    fetchEntries();
  };

  const handleEdit = (entry: VaultEntry) => {
    setForm({ title: entry.title, content: entry.content, type: entry.type });
    setSelected(entry);
    setShowForm(true);
  };

  const handleLogout = async () => {
    await authApi.logout();
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <span className="font-bold text-white">SecureVault</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelected(null); setForm({ title: "", content: "", type: "credential" }); setShowForm(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + New Entry
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading your vault...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🗄️</div>
            <p className="text-gray-400">Your vault is empty.</p>
            <p className="text-gray-600 text-sm mt-1">Create your first entry to get started.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{TYPE_ICONS[entry.type]}</span>
                  <div>
                    <p className="font-medium text-white">{entry.title}</p>
                    <p className="text-xs text-gray-500">{TYPE_LABELS[entry.type]} · Updated {new Date(entry.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(entry)} className="text-indigo-400 hover:text-indigo-300 text-sm px-3 py-1 rounded-lg hover:bg-indigo-900/30 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(entry.id)} className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded-lg hover:bg-red-900/30 transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Entry Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              {selected ? "Edit Entry" : "New Entry"}
            </h3>

            {error && <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Gmail Account"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="credential">🔑 Credential</option>
                  <option value="note">📝 Secure Note</option>
                  <option value="card">💳 Card</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Content</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Store your sensitive content here. It will be encrypted."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg py-2 transition-colors">
                {selected ? "Save Changes" : "Create Entry"}
              </button>
              <button onClick={() => { setShowForm(false); setSelected(null); }} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg py-2 transition-colors">
                Cancel
              </button>
            </div>

            <p className="text-center text-gray-600 text-xs mt-3">🔒 Content is encrypted with AES-256-GCM before storage</p>
          </div>
        </div>
      )}
    </div>
  );
}
