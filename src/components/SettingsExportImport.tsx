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
                    className="px-4 py-1.5 rounded-[3px] bg-[#4e5058]/30 hover:bg-[#4e5058]/60 border border-transparent text-[#f2f3f5] font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                    {exporting ? (
                        <span className="w-4 h-4 border-2 border-[#f2f3f5] border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <span>📤</span>
                    )}
                    Export Settings
                </button>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-1.5 rounded-[3px] bg-[#5865f2] hover:bg-[#4752c4] border border-transparent text-white font-bold text-xs transition flex items-center gap-2"
                >
                    <span>📥</span> Import Settings
                </button>
            </div>

            {/* Success/Error message toast */}
            {/* Success/Error message toast -> Removed */}

            {/* Import Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
                    <div className="bg-[#2b2d31] rounded-[8px] p-6 max-w-md w-full mx-4 shadow-2xl border border-[#1e1f22] animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-[#1e1f22] rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl text-[#5865f2]">📥</span>
                            </div>
                            <h2 className="text-xl font-black text-[#f2f3f5]">Import Settings</h2>
                            <p className="text-[#b5bac1] text-sm mt-1">Upload a previously exported settings file</p>
                        </div>

                        <div className="space-y-4">
                            {/* File Upload */}
                            <div>
                                <label className="block text-[11px] font-bold text-[#b5bac1] mb-2 uppercase tracking-wider">Settings File (.json)</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileUpload}
                                        className="w-full px-4 py-3 rounded-[3px] bg-[#1e1f22] border border-transparent focus:border-[#5865f2] focus:outline-none font-medium text-sm text-[#dbdee1] file:mr-4 file:py-1 file:px-3 file:rounded-[3px] file:border-0 file:bg-[#4e5058]/30 file:text-[#f2f3f5] file:font-bold file:text-xs file:cursor-pointer transition-all"
                                    />
                                </div>
                            </div>

                            {/* Preview */}
                            {importData && (
                                <div className="bg-[#1e1f22] rounded-[3px] p-3 border border-[#1e1f22] max-h-32 overflow-auto custom-scrollbar">
                                    <pre className="text-[11px] font-mono text-[#4e5058] whitespace-pre-wrap break-all">
                                        {importData.slice(0, 500)}{importData.length > 500 ? "..." : ""}
                                    </pre>
                                </div>
                            )}

                            {/* Overwrite option */}
                            <label className="flex items-center justify-between p-3 bg-[#1e1f22]/50 rounded-[8px] border border-[#1e1f22] cursor-pointer hover:bg-[#1e1f22]/80 transition-all">
                                <div>
                                    <span className="text-[#f2f3f5] font-bold text-sm">Overwrite existing settings</span>
                                    <p className="text-[#4e5058] text-[11px]">Replace current settings instead of merging</p>
                                </div>
                                <div
                                    className={`w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${overwrite ? 'bg-[#248046]' : 'bg-[#4e5058]'}`}
                                    onClick={() => setOverwrite(!overwrite)}
                                >
                                    <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform duration-200 ease-in-out ${overwrite ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                            </label>

                            {/* Warning */}
                            <div className="bg-[#da373c]/10 border border-[#da373c]/30 rounded-[8px] p-4 flex gap-3">
                                <span className="text-xl">⚠️</span>
                                <div className="text-xs">
                                    <p className="font-bold text-[#da373c] uppercase tracking-wider mb-1 text-[10px]">Security Warning</p>
                                    <p className="text-[#b5bac1] leading-relaxed">Importing settings will modify your server configuration. Only upload files from sources you trust.</p>
                                </div>
                            </div>

                            {/* Message */}
                            {/* Message -> Removed */}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 bg-transparent hover:underline text-[#f2f3f5] font-bold rounded-[3px] transition text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!importData || importing}
                                className="flex-[2] py-2.5 bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold rounded-[3px] transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-black/20"
                            >
                                {importing ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
