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
