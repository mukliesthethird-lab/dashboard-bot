"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Form, FormPage, FormComponent, FormSelectOption, Channel, Role, EmbedData, Component } from "@/types";
import CustomDropdown from "./CustomDropdown";

interface FormEditorProps {
    form: Form;
    channels: Channel[];
    roles: Role[];
    guildId: string;
    onSave: (form: Form) => void;
    onClose: () => void;
    saving: boolean;
}

// Generate unique ID
const generateId = () => `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function FormEditor({
    form: initialForm,
    channels,
    roles,
    guildId,
    onSave,
    onClose,
    saving
}: FormEditorProps) {
    const [form, setForm] = useState<Form>(initialForm);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<"form" | "settings" | "panel">("form");
    const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    // Get current page
    const currentPage = form.pages[activePageIndex] || form.pages[0];

    // Update form field
    const updateForm = (updates: Partial<Form>) => {
        setForm(prev => ({ ...prev, ...updates }));
    };

    // Update current page
    const updatePage = (updates: Partial<FormPage>) => {
        const newPages = [...form.pages];
        newPages[activePageIndex] = { ...currentPage, ...updates };
        updateForm({ pages: newPages });
    };

    // Add new page
    const addPage = () => {
        const newPage: FormPage = {
            id: `page_${Date.now()}`,
            title: `Page ${form.pages.length + 1}`,
            components: []
        };
        updateForm({ pages: [...form.pages, newPage] });
        setActivePageIndex(form.pages.length);
    };

    // Delete page
    const deletePage = (index: number) => {
        if (form.pages.length <= 1) return;
        const newPages = form.pages.filter((_, i) => i !== index);
        updateForm({ pages: newPages });
        if (activePageIndex >= newPages.length) {
            setActivePageIndex(newPages.length - 1);
        }
    };

    // Add component to current page
    const addComponent = (type: "text_input" | "select_menu") => {
        if (currentPage.components.length >= 5) return;

        const newComponent: FormComponent = {
            id: generateId(),
            type,
            label: type === "text_input" ? "New Question" : "Select Option",
            description: "",
            placeholder: "",
            required: false,
            ...(type === "text_input" ? {
                style: "short" as const,
                min_length: 0,
                max_length: 4000,
                pre_filled_value: ""
            } : {
                options: [{ label: "Option 1", value: "option_1" }],
                min_values: 1,
                max_values: 1
            })
        };

        updatePage({ components: [...currentPage.components, newComponent] });
        setExpandedComponent(newComponent.id);
    };

    // Update component
    const updateComponent = (componentId: string, updates: Partial<FormComponent>) => {
        const newComponents = currentPage.components.map(comp =>
            comp.id === componentId ? { ...comp, ...updates } : comp
        );
        updatePage({ components: newComponents });
    };

    // Delete component
    const deleteComponent = (componentId: string) => {
        updatePage({ components: currentPage.components.filter(c => c.id !== componentId) });
        if (expandedComponent === componentId) {
            setExpandedComponent(null);
        }
    };

    // Move component up/down
    const moveComponent = (index: number, direction: "up" | "down") => {
        const newComponents = [...currentPage.components];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newComponents.length) return;
        [newComponents[index], newComponents[targetIndex]] = [newComponents[targetIndex], newComponents[index]];
        updatePage({ components: newComponents });
    };

    // Add select option
    const addSelectOption = (componentId: string) => {
        const comp = currentPage.components.find(c => c.id === componentId);
        if (!comp || comp.type !== "select_menu") return;

        const newOption: FormSelectOption = {
            label: `Option ${(comp.options?.length || 0) + 1}`,
            value: `option_${Date.now()}`
        };
        updateComponent(componentId, {
            options: [...(comp.options || []), newOption]
        });
    };

    // Update select option
    const updateSelectOption = (componentId: string, optionIndex: number, updates: Partial<FormSelectOption>) => {
        const comp = currentPage.components.find(c => c.id === componentId);
        if (!comp || !comp.options) return;

        const newOptions = [...comp.options];
        newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates };
        updateComponent(componentId, { options: newOptions });
    };

    // Delete select option
    const deleteSelectOption = (componentId: string, optionIndex: number) => {
        const comp = currentPage.components.find(c => c.id === componentId);
        if (!comp || !comp.options || comp.options.length <= 1) return;

        updateComponent(componentId, {
            options: comp.options.filter((_, i) => i !== optionIndex)
        });
    };

    // Text channels only
    const textChannels = channels.filter(c => c.position >= 0).sort((a, b) => a.position - b.position);

    const modalContent = (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {form.id ? "Edit Form" : "Create Form"}
                            </h2>
                            <p className="text-sm text-gray-400">{form.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    {[
                        { id: "form", label: "Form Editor", icon: "📝" },
                        { id: "settings", label: "Submission Settings", icon: "⚙️" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 px-4 py-3 font-semibold transition-all ${activeTab === tab.id
                                ? "bg-amber-500/10 text-amber-400 border-b-2 border-amber-500"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === "form" && (
                        <div className="space-y-6">
                            {/* Form Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        Form Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => updateForm({ name: e.target.value })}
                                        placeholder="e.g., Staff Application"
                                        maxLength={45}
                                        className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{form.name.length}/45</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        Modal Title <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => updateForm({ title: e.target.value })}
                                        placeholder="e.g., Staff Application Form"
                                        maxLength={45}
                                        className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{form.title.length}/45 - Shown at the top of the Discord modal</p>
                                </div>
                            </div>

                            {/* Page Tabs */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {form.pages.map((page, idx) => (
                                    <div
                                        key={page.id}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${activePageIndex === idx
                                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                            : "bg-[#12121a] text-gray-400 border border-white/10 hover:border-white/20"
                                            }`}
                                        onClick={() => setActivePageIndex(idx)}
                                    >
                                        <span className="font-semibold text-sm">Page {idx + 1}</span>
                                        <span className="text-xs opacity-60">({page.components.length}/5)</span>
                                        {form.pages.length > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deletePage(idx);
                                                }}
                                                className="ml-1 p-0.5 hover:bg-red-500/20 rounded text-red-400"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={addPage}
                                    className="flex items-center gap-1 px-3 py-2 bg-[#12121a] text-gray-400 border border-dashed border-white/20 rounded-lg hover:border-amber-500/50 hover:text-amber-400 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Page
                                </button>
                            </div>

                            {/* Components */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        Components
                                        <span className="text-xs font-normal text-gray-500">
                                            {currentPage.components.length}/5
                                        </span>
                                    </h3>
                                </div>

                                {/* Component List */}
                                {currentPage.components.length === 0 ? (
                                    <div className="p-8 border border-dashed border-white/10 rounded-xl text-center">
                                        <p className="text-gray-400 mb-4">No components yet. Add your first question!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {currentPage.components.map((comp, idx) => (
                                            <div
                                                key={comp.id}
                                                className={`border rounded-xl overflow-hidden transition-all ${expandedComponent === comp.id
                                                    ? "border-amber-500/30 bg-[#12121a]"
                                                    : "border-white/10 bg-[#12121a]/50"
                                                    }`}
                                            >
                                                {/* Component Header */}
                                                <div
                                                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5"
                                                    onClick={() => setExpandedComponent(
                                                        expandedComponent === comp.id ? null : comp.id
                                                    )}
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); moveComponent(idx, "up"); }}
                                                            disabled={idx === 0}
                                                            className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                                                        >
                                                            ▲
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); moveComponent(idx, "down"); }}
                                                            disabled={idx === currentPage.components.length - 1}
                                                            className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                                                        >
                                                            ▼
                                                        </button>
                                                    </div>
                                                    <span className="text-xl">
                                                        {comp.type === "text_input" ? "📝" : "📋"}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-white truncate">{comp.label}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {comp.type === "text_input" ? "Text Input" : "Select Menu"}
                                                            {comp.required && <span className="text-red-400 ml-2">Required</span>}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteComponent(comp.id); }}
                                                        className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                                    >
                                                        🗑️
                                                    </button>
                                                    <svg
                                                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedComponent === comp.id ? "rotate-180" : ""
                                                            }`}
                                                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>

                                                {/* Expanded Content */}
                                                {expandedComponent === comp.id && (
                                                    <div className="p-4 border-t border-white/10 space-y-4">
                                                        {/* Label */}
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                                                                Label <span className="text-red-400">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={comp.label}
                                                                onChange={(e) => updateComponent(comp.id, { label: e.target.value })}
                                                                maxLength={45}
                                                                className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-white focus:border-amber-500 transition-all"
                                                            />
                                                        </div>

                                                        {/* Description */}
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                                                                Description
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={comp.description || ""}
                                                                onChange={(e) => updateComponent(comp.id, { description: e.target.value })}
                                                                maxLength={100}
                                                                placeholder="Optional helper text"
                                                                className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 transition-all"
                                                            />
                                                        </div>

                                                        {/* Text Input specific fields */}
                                                        {comp.type === "text_input" && (
                                                            <>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <label className="flex items-center gap-3 p-3 bg-[#0a0a0f] rounded-lg cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`style_${comp.id}`}
                                                                            checked={comp.style === "short"}
                                                                            onChange={() => updateComponent(comp.id, { style: "short" })}
                                                                            className="accent-amber-500"
                                                                        />
                                                                        <div>
                                                                            <p className="font-semibold text-white text-sm">Short</p>
                                                                            <p className="text-xs text-gray-500">Single line</p>
                                                                        </div>
                                                                    </label>
                                                                    <label className="flex items-center gap-3 p-3 bg-[#0a0a0f] rounded-lg cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`style_${comp.id}`}
                                                                            checked={comp.style === "paragraph"}
                                                                            onChange={() => updateComponent(comp.id, { style: "paragraph" })}
                                                                            className="accent-amber-500"
                                                                        />
                                                                        <div>
                                                                            <p className="font-semibold text-white text-sm">Paragraph</p>
                                                                            <p className="text-xs text-gray-500">Multi-line</p>
                                                                        </div>
                                                                    </label>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="block text-sm font-semibold text-gray-300 mb-2">Min Length</label>
                                                                        <input
                                                                            type="number"
                                                                            value={comp.min_length || 0}
                                                                            onChange={(e) => updateComponent(comp.id, { min_length: parseInt(e.target.value) || 0 })}
                                                                            min={0}
                                                                            max={4000}
                                                                            className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-white focus:border-amber-500 transition-all"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-semibold text-gray-300 mb-2">Max Length</label>
                                                                        <input
                                                                            type="number"
                                                                            value={comp.max_length || 4000}
                                                                            onChange={(e) => updateComponent(comp.id, { max_length: parseInt(e.target.value) || 4000 })}
                                                                            min={1}
                                                                            max={4000}
                                                                            className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-white focus:border-amber-500 transition-all"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Placeholder</label>
                                                                    <input
                                                                        type="text"
                                                                        value={comp.placeholder || ""}
                                                                        onChange={(e) => updateComponent(comp.id, { placeholder: e.target.value })}
                                                                        maxLength={100}
                                                                        placeholder="e.g., Enter your answer here..."
                                                                        className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 transition-all"
                                                                    />
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Select Menu specific fields */}
                                                        {comp.type === "select_menu" && (
                                                            <div className="space-y-3">
                                                                <label className="block text-sm font-semibold text-gray-300">Options</label>
                                                                {comp.options?.map((opt, optIdx) => (
                                                                    <div key={optIdx} className="flex items-center gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={opt.label}
                                                                            onChange={(e) => updateSelectOption(comp.id, optIdx, {
                                                                                label: e.target.value,
                                                                                value: e.target.value.toLowerCase().replace(/\s+/g, "_")
                                                                            })}
                                                                            placeholder="Option label"
                                                                            className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-white focus:border-amber-500 transition-all"
                                                                        />
                                                                        <button
                                                                            onClick={() => deleteSelectOption(comp.id, optIdx)}
                                                                            disabled={comp.options?.length === 1}
                                                                            className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 disabled:opacity-30 transition-colors"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <button
                                                                    onClick={() => addSelectOption(comp.id)}
                                                                    className="w-full py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-amber-400 hover:border-amber-500/50 transition-all"
                                                                >
                                                                    + Add Option
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Required toggle */}
                                                        <label className="flex items-center gap-3 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={comp.required}
                                                                onChange={(e) => updateComponent(comp.id, { required: e.target.checked })}
                                                                className="w-5 h-5 accent-amber-500 rounded"
                                                            />
                                                            <span className="font-semibold text-white">Required</span>
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Component Buttons */}
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => addComponent("text_input")}
                                        disabled={currentPage.components.length >= 5}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        📝 Add Text Input
                                    </button>
                                    <button
                                        onClick={() => addComponent("select_menu")}
                                        disabled={currentPage.components.length >= 5}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        📋 Add Select Menu
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "settings" && (
                        <div className="space-y-6">
                            {/* Submission Type */}
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-3">Submission Type</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { id: "default", label: "Default", icon: "📤", desc: "Send response to channel" },
                                        { id: "application", label: "Application", icon: "📝", desc: "With approve/deny" },
                                        { id: "ticket", label: "Ticket", icon: "🎫", desc: "Create a ticket" },
                                    ].map((type) => (
                                        <label
                                            key={type.id}
                                            className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${form.submission_type === type.id
                                                ? "bg-amber-500/20 border-2 border-amber-500"
                                                : "bg-[#12121a] border-2 border-white/10 hover:border-white/20"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="submission_type"
                                                value={type.id}
                                                checked={form.submission_type === type.id}
                                                onChange={(e) => updateForm({ submission_type: e.target.value as any })}
                                                className="hidden"
                                            />
                                            <span className="text-2xl">{type.icon}</span>
                                            <div>
                                                <p className="font-bold text-white">{type.label}</p>
                                                <p className="text-xs text-gray-400">{type.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Submission Channel */}
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">
                                    Submission Channel <span className="text-red-400">*</span>
                                </label>
                                <CustomDropdown
                                    options={[
                                        { value: "", label: "Select a channel..." },
                                        ...textChannels.map(c => ({ value: c.id, label: `#${c.name}` }))
                                    ]}
                                    value={form.submission_channel_id || ""}
                                    onChange={(value) => updateForm({ submission_channel_id: value })}
                                    placeholder="Select channel"
                                />
                                <p className="text-xs text-gray-500 mt-1">Where form responses will be sent</p>
                            </div>

                            {/* Ping Roles */}
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Ping Roles on Submission</label>
                                <div className="flex flex-wrap gap-2 p-3 bg-[#12121a] border border-white/10 rounded-xl min-h-[48px]">
                                    {form.ping_roles.map((roleId) => {
                                        const role = roles.find(r => r.id === roleId);
                                        return (
                                            <span
                                                key={roleId}
                                                className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg text-sm"
                                                style={{ color: role ? `#${role.color.toString(16).padStart(6, "0")}` : "white" }}
                                            >
                                                @{role?.name || roleId}
                                                <button
                                                    onClick={() => updateForm({ ping_roles: form.ping_roles.filter(r => r !== roleId) })}
                                                    className="ml-1 text-gray-400 hover:text-red-400"
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        );
                                    })}
                                    <select
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value && !form.ping_roles.includes(e.target.value)) {
                                                updateForm({ ping_roles: [...form.ping_roles, e.target.value] });
                                            }
                                        }}
                                        className="px-2 py-1 bg-transparent border border-dashed border-white/20 rounded-lg text-gray-400 text-sm hover:border-amber-500/50 cursor-pointer"
                                    >
                                        <option value="">+ Add role</option>
                                        {roles.filter(r => !form.ping_roles.includes(r.id)).map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Cooldown */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Cooldown (seconds)</label>
                                    <input
                                        type="number"
                                        value={form.cooldown_seconds}
                                        onChange={(e) => updateForm({ cooldown_seconds: parseInt(e.target.value) || 0 })}
                                        min={0}
                                        className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-xl text-white focus:border-amber-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Max Submissions per User</label>
                                    <input
                                        type="number"
                                        value={form.max_submissions_per_user}
                                        onChange={(e) => updateForm({ max_submissions_per_user: parseInt(e.target.value) || 0 })}
                                        min={0}
                                        placeholder="0 = unlimited"
                                        className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-xl text-white focus:border-amber-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Advanced Settings - Role Requirements */}
                            <div className="pt-4 border-t border-white/10">
                                <h3 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
                                    🔐 Access Requirements
                                </h3>

                                {/* Required Roles */}
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Required Roles</label>
                                    <p className="text-xs text-gray-500 mb-2">Users must have at least one of these roles to open the form</p>
                                    <div className="flex flex-wrap gap-2 p-3 bg-[#12121a] border border-white/10 rounded-xl min-h-[48px]">
                                        {(form.required_roles || []).map((roleId) => {
                                            const role = roles.find(r => r.id === roleId);
                                            return (
                                                <span
                                                    key={roleId}
                                                    className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg text-sm"
                                                    style={{ color: role ? `#${role.color.toString(16).padStart(6, "0")}` : "white" }}
                                                >
                                                    @{role?.name || roleId}
                                                    <button
                                                        onClick={() => updateForm({ required_roles: (form.required_roles || []).filter(r => r !== roleId) })}
                                                        className="ml-1 text-gray-400 hover:text-red-400"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            );
                                        })}
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value && !(form.required_roles || []).includes(e.target.value)) {
                                                    updateForm({ required_roles: [...(form.required_roles || []), e.target.value] });
                                                }
                                            }}
                                            className="px-2 py-1 bg-transparent border border-dashed border-white/20 rounded-lg text-gray-400 text-sm hover:border-amber-500/50 cursor-pointer"
                                        >
                                            <option value="">+ Add role</option>
                                            {roles.filter(r => !(form.required_roles || []).includes(r.id)).map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Blacklist Roles */}
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Blacklisted Roles</label>
                                    <p className="text-xs text-gray-500 mb-2">Users with any of these roles cannot open the form</p>
                                    <div className="flex flex-wrap gap-2 p-3 bg-[#12121a] border border-white/10 rounded-xl min-h-[48px]">
                                        {(form.blacklist_roles || []).map((roleId) => {
                                            const role = roles.find(r => r.id === roleId);
                                            return (
                                                <span
                                                    key={roleId}
                                                    className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded-lg text-sm text-red-400"
                                                >
                                                    @{role?.name || roleId}
                                                    <button
                                                        onClick={() => updateForm({ blacklist_roles: (form.blacklist_roles || []).filter(r => r !== roleId) })}
                                                        className="ml-1 text-gray-400 hover:text-red-400"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            );
                                        })}
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value && !(form.blacklist_roles || []).includes(e.target.value)) {
                                                    updateForm({ blacklist_roles: [...(form.blacklist_roles || []), e.target.value] });
                                                }
                                            }}
                                            className="px-2 py-1 bg-transparent border border-dashed border-white/20 rounded-lg text-gray-400 text-sm hover:border-red-500/50 cursor-pointer"
                                        >
                                            <option value="">+ Add role</option>
                                            {roles.filter(r => !(form.blacklist_roles || []).includes(r.id)).map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Account Age */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Minimum Account Age (days)</label>
                                    <input
                                        type="number"
                                        value={form.min_account_age_days || 0}
                                        onChange={(e) => updateForm({ min_account_age_days: parseInt(e.target.value) || 0 })}
                                        min={0}
                                        placeholder="0 = no requirement"
                                        className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-xl text-white focus:border-amber-500 transition-all"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Set to 0 to disable this requirement</p>
                                </div>
                            </div>

                            {/* Messages & DM Templates */}
                            <div className="pt-4 border-t border-white/10">
                                <h3 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
                                    💬 Messages & DM Templates
                                </h3>

                                {/* Success Message */}
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Success Message</label>
                                    <textarea
                                        value={form.success_message || ""}
                                        onChange={(e) => updateForm({ success_message: e.target.value })}
                                        placeholder="Thank you for your submission!"
                                        rows={2}
                                        className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-xl text-white focus:border-amber-500 transition-all resize-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Message shown after successful submission</p>
                                </div>

                                {form.submission_type === "application" && (
                                    <>
                                        {/* Approve DM Template */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-bold text-gray-300 mb-2">Approval DM Template</label>
                                            <textarea
                                                value={form.approve_dm_template || ""}
                                                onChange={(e) => updateForm({ approve_dm_template: e.target.value })}
                                                placeholder="Congratulations! Your application has been approved."
                                                rows={3}
                                                className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-xl text-white focus:border-green-500 transition-all resize-none"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">DM sent when application is approved. Use {"{user}"} for username</p>
                                        </div>

                                        {/* Deny DM Template */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-bold text-gray-300 mb-2">Denial DM Template</label>
                                            <textarea
                                                value={form.deny_dm_template || ""}
                                                onChange={(e) => updateForm({ deny_dm_template: e.target.value })}
                                                placeholder="Unfortunately, your application has been denied."
                                                rows={3}
                                                className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-xl text-white focus:border-red-500 transition-all resize-none"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">DM sent when application is denied. Use {"{user}"}, {"{reason}"}</p>
                                        </div>

                                        {/* Roles on Approve */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-300 mb-2">Add Roles on Approve</label>
                                            <div className="flex flex-wrap gap-2 p-3 bg-[#12121a] border border-white/10 rounded-xl min-h-[48px]">
                                                {(form.add_roles_on_approve || []).map((roleId) => {
                                                    const role = roles.find(r => r.id === roleId);
                                                    return (
                                                        <span
                                                            key={roleId}
                                                            className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-lg text-sm text-green-400"
                                                        >
                                                            @{role?.name || roleId}
                                                            <button
                                                                onClick={() => updateForm({ add_roles_on_approve: (form.add_roles_on_approve || []).filter(r => r !== roleId) })}
                                                                className="ml-1 text-gray-400 hover:text-red-400"
                                                            >
                                                                ✕
                                                            </button>
                                                        </span>
                                                    );
                                                })}
                                                <select
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value && !(form.add_roles_on_approve || []).includes(e.target.value)) {
                                                            updateForm({ add_roles_on_approve: [...(form.add_roles_on_approve || []), e.target.value] });
                                                        }
                                                    }}
                                                    className="px-2 py-1 bg-transparent border border-dashed border-white/20 rounded-lg text-gray-400 text-sm hover:border-green-500/50 cursor-pointer"
                                                >
                                                    <option value="">+ Add role</option>
                                                    {roles.filter(r => !(form.add_roles_on_approve || []).includes(r.id)).map(r => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Roles added when application is approved</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-white/10 bg-[#0a0a0f]">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-400 hover:text-white font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={saving || !form.name || !form.title}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save Form
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    if (!mounted) return null;

    return createPortal(modalContent, document.body);
}
