"use client";

import { useState } from "react";
import ToastContainer, { useToast } from "./Toast";

interface SettingsExportImportProps {
    guildId: string;
}

export default function SettingsExportImport({ guildId }: SettingsExportImportProps) {
    const [showModal, setShowModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const { toast, success, error, hideToast } = useToast();
    const [importData, setImportData] = useState<string>("");
    const [overwrite, setOverwrite] = useState(false);

    const handleExport = async () => {
        setExporting(true);

        try {
            const res = await fetch(`/api/settings?guild_id=${guildId}`);
            if (res.ok) {
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `donpollo-settings-${guildId}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                success("Settings exported successfully!");
            } else {
                error("Failed to export settings");
            }
        } catch {
            error("Network error");
        }

        setExporting(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImportData(event.target?.result as string);
            };
            reader.readAsText(file);
        }
    };

    const handleImport = async () => {
        if (!importData) {
            error("Please select a file to import");
            return;
        }

        setImporting(true);

        try {
            const settings = JSON.parse(importData);

            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    guild_id: guildId,
                    settings,
                    overwrite
                })
            });

            const data = await res.json();

            if (res.ok) {
                success(data.message || "Settings imported successfully!");
                setImportData("");
                setShowModal(false);
            } else {
                error(data.error || "Import failed");
            }
        } catch {
            error("Invalid JSON file");
        }

        setImporting(false);
    };

    return (
        <>
            {/* Compact Export/Import Buttons */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                    {exporting ? (
                        <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <span>📤</span>
                    )}
                    Export
                </button>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-sm transition flex items-center gap-2"
                >
                    <span>📥</span> Import
                </button>
            </div>

            {/* Success/Error message toast */}
            {/* Success/Error message toast -> Removed */}

            {/* Import Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-[#16161f] rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">📥</div>
                            <h2 className="text-2xl font-black text-white">Import Settings</h2>
                            <p className="text-gray-400 text-sm">Upload a previously exported settings file</p>
                        </div>

                        <div className="space-y-4">
                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Settings File</label>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileUpload}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none font-medium text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:text-cyan-400 file:font-bold file:cursor-pointer"
                                />
                            </div>

                            {/* Preview */}
                            {importData && (
                                <div className="bg-white/5 rounded-xl p-3 border border-white/10 max-h-32 overflow-auto">
                                    <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">
                                        {importData.slice(0, 500)}{importData.length > 500 ? "..." : ""}
                                    </pre>
                                </div>
                            )}

                            {/* Overwrite option */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={overwrite}
                                    onChange={(e) => setOverwrite(e.target.checked)}
                                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                                />
                                <div>
                                    <span className="text-gray-200 font-bold text-sm">Overwrite existing settings</span>
                                    <p className="text-gray-500 text-xs">Replace current settings instead of merging</p>
                                </div>
                            </label>

                            {/* Warning */}
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-400 text-sm">
                                <strong>⚠️ Warning:</strong> Importing settings will modify your server configuration. Make sure you trust the source file.
                            </div>

                            {/* Message */}
                            {/* Message -> Removed */}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition border border-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!importData || importing}
                                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {importing ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        Importing...
                                    </>
                                ) : (
                                    "Import Settings"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ToastContainer toast={toast} onClose={hideToast} />
        </>
    );
}
