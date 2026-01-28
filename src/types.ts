export interface Channel {
    id: string;
    name: string;
    position: number;
}

export interface Role {
    id: string;
    name: string;
    color: number;
    position: number;
}

export interface EmbedField {
    name: string;
    value: string;
    inline: boolean;
}

export interface EmbedData {
    author_name: string;
    author_url?: string;
    author_icon_url: string;
    title: string;
    url?: string; // Title URL
    description: string;
    color: string;
    thumbnail_url: string;
    image_url: string;
    footer_text: string;
    footer_icon_url: string;
    timestamp?: boolean;
    fields: EmbedField[];
}

export interface BotAction {
    type: string;
    role_id?: string;
    target_channel_id?: string;
    message_content?: string;
    success_message?: string;
    failure_message?: string;
}

export interface SelectOption {
    label: string;
    value: string;
    description?: string;
    emoji?: string;
    default?: boolean;
    actions?: BotAction[];
}

export interface Component {
    type: number; // 2 for Button, 3 for Select Menu
    style?: number;
    label?: string;
    emoji?: string;
    custom_id?: string;
    url?: string;
    placeholder?: string;
    options?: SelectOption[];
    min_values?: number;
    max_values?: number;
    disabled?: boolean;
    actions?: BotAction[];
}

export interface ReactionRoleMessage {
    id?: number;
    message_id: string | null;
    channel_id: string;
    message_content: string;
    embeds: EmbedData[];
    component_rows?: Component[][];
}

export interface GlobalRolesSettings {
    join_roles_enabled: boolean;
    join_roles: string[];
    reaction_roles_enabled: boolean;
}

export interface VariableItem {
    category: string;
    variable: string;
    description: string;
    preview: string;
}

// ===== FORMS FEATURE TYPES =====

export interface FormSelectOption {
    label: string;
    value: string;
    description?: string;
    emoji?: string;
}

export interface FormComponent {
    id: string;
    type: 'text_input' | 'select_menu';
    label: string;
    description?: string;
    placeholder?: string;
    required: boolean;
    // Text input specific
    style?: 'short' | 'paragraph';
    min_length?: number;
    max_length?: number;
    pre_filled_value?: string;
    // Select menu specific
    options?: FormSelectOption[];
    min_values?: number;
    max_values?: number;
}

export interface FormPage {
    id: string;
    title?: string;
    components: FormComponent[];
}

export interface Form {
    id?: number;
    guild_id: string;
    name: string;
    title: string;
    description?: string;
    is_enabled: boolean;
    submission_type: 'default' | 'application' | 'ticket';
    submission_channel_id?: string;
    ping_roles: string[];
    add_roles_on_submit: string[];
    remove_roles_on_submit: string[];
    cooldown_seconds: number;
    max_submissions_per_user: number;
    pages: FormPage[];
    created_at?: string;
    updated_at?: string;
}

export interface FormPanel {
    id?: number;
    form_id: number;
    guild_id: string;
    channel_id: string;
    message_id?: string;
    message_content: string;
    embed_data?: EmbedData;
    components: Component[][];
    webhook_name?: string;
    webhook_avatar_url?: string;
    is_sticky: boolean;
}

export interface FormSubmission {
    id: number;
    form_id: number;
    guild_id: string;
    user_id: string;
    user_name?: string;
    user_avatar?: string;
    responses: Record<string, string>;
    status: 'pending' | 'approved' | 'denied';
    reviewed_by?: string;
    reviewed_at?: string;
    submitted_at: string;
}
