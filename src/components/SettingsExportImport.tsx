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
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[4px] transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {exporting && (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    )}
                    Export Settings
                </button>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[4px] transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    Import Settings
                </button>
            </div>

            {/* Success/Error message toast */}
            {/* Success/Error message toast -> Removed */}

            {/* Import Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setShowModal(false)}>
                    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                                <svg className="w-10 h-10 text-[#5865F2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-black text-white">Import Settings</h2>
                            <p className="text-[var(--text-secondary)] mt-2 font-medium">Upload a previously exported settings file</p>
                        </div>

                        <div className="space-y-6">
                            {/* File Upload */}
                            <div>
                                <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-widest pl-1">Settings File (.json)</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileUpload}
                                        className="w-full px-4 py-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-500/20 file:text-indigo-300 file:font-bold file:cursor-pointer hover:bg-[var(--bg-hover)] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Preview */}
                            {importData && (
                                <div className="bg-[var(--bg-tertiary)] rounded-[3px] p-3 border border-[var(--border)] max-h-32 overflow-auto custom-scrollbar">
                                    <pre className="text-[11px] font-mono text-[var(--text-tertiary)] whitespace-pre-wrap break-all">
                                        {importData.slice(0, 500)}{importData.length > 500 ? "..." : ""}
                                    </pre>
                                </div>
                            )}

                            {/* Overwrite option */}
                            <label className="flex items-center justify-between p-3 bg-white/3 rounded-[12px] border border-[var(--border)] cursor-pointer hover:bg-[var(--bg-hover)] transition-all">
                                <div>
                                    <span className="text-white font-bold text-sm">Overwrite existing settings</span>
                                    <p className="text-[var(--text-tertiary)] text-[11px]">Replace current settings instead of merging</p>
                                </div>
                                    <div
                                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${overwrite ? 'bg-emerald-500' : 'bg-gray-700'}`}
                                        onClick={() => setOverwrite(!overwrite)}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform duration-200 ease-in-out ${overwrite ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                            </label>

                            {/* Warning */}
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-[12px] p-4 flex gap-3">
                                <svg className="w-6 h-6 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div className="text-xs">
                                    <p className="font-bold text-rose-500 uppercase tracking-wider mb-1 text-[10px]">Security Warning</p>
                                    <p className="text-[var(--text-secondary)] leading-relaxed">Importing settings will modify your server configuration. Only upload files from sources you trust.</p>
                                </div>
                            </div>

                            {/* Message */}
                            {/* Message -> Removed */}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 bg-transparent hover:underline text-[var(--text-secondary)] hover:text-white font-bold rounded-[8px] transition text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!importData || importing}
                                className="flex-[2] py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-[8px] transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/25"
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


