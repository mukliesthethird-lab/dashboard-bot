"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

interface EmojiPickerProps {
    value: string;
    onChange: (emoji: string) => void;
    className?: string;
    guildId?: string;
    trigger?: React.ReactNode;
}

interface CustomEmoji {
    id: string;
    name: string;
    animated: boolean;
    available: boolean;
}

// Standard Categories
const CATEGORIES = [
    { id: "people", label: "People", icon: "😀", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🙈", "🙉", "🙊", "💋", "💌", "💘", "💝", "💖", "💗", "💓", "💞", "💕", "💟", "❣️", "💔", "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💣", "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤"] },
    { id: "nature", label: "Nature", icon: "🌲", emojis: ["🐵", "🐒", "🦍", "🐶", "🐕", "🦮", "🐕‍🦺", "🐩", "🐺", "🦊", "🦝", "🐱", "🐈", "🐈‍⬛", "🦁", "🐯", "🐅", "🐆", "🐴", "🐎", "🦄", "🦓", "🦌", "🐮", "🐂", "🐃", "🐄", "🐷", "🐖", "🐗", "🐽", "🐏", "🐑", "🐐", "🐪", "🐫", "🦙", "🦒", "🐘", "🦏", "🦛", "🐭", "🐁", "🐀", "🐹", "🐰", "🐇", "🐿️", "🦔", "🦇", "🐻", "🐻‍❄️", "🐨", "🐼", "🦥", "🦦", "🦨", "🦘", "🦡", "🐾", "🦃", "🐔", "🐓", "🐣", "🐤", "🐥", "🐦", "🐧", "🕊️", "🦅", "🦆", "🦢", "🦉", "🦩", "🦚", "🦜", "🐸", "🐊", "🐢", "🦎", "🐍", "🐲", "🐉", "🦕", "🦖", "🐳", "🐋", "🐬", "🐟", "🐠", "🐡", "🦈", "🐙", "🐚", "🐌", "🦋", "🐛", "🐜", "🐝", "🐞", "🦗", "🕷️", "🕸️", "🦂", "🦟", "🦠", "💐", "🌸", "💮", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🪴", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃"] },
    { id: "food", label: "Food", icon: "🍔", emojis: ["🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍏", "🍐", "🍑", "🍒", "🍓", "🫐", "🥝", "🍅", "🫒", "🥥", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🌰", "🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🧀", "🍖", "🍗", "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "🧈", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡", "🦀", "🦞", "🦐", "🦑", "🦪", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🍼", "🥛", "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🧋", "🧃", "🧉", "🧊", "🥢", "🍽️", "🍴", "🥄", "🔪", "🏺"] },
    { id: "activity", label: "Activities", icon: "⚽", emojis: ["🎃", "🎄", "🎆", "🎇", "🧨", "✨", "🎈", "🎉", "🎊", "🎋", "🎍", "🎎", "🎏", "🎐", "🎑", "🧧", "🎀", "🎁", "🎗️", "🎟️", "🎫", "🎖️", "🏆", "🏅", "🥇", "🥈", "🥉", "⚽", "⚾", "🥎", "🏀", "🏐", "🏈", "🏉", "🎾", "🥏", "🎳", "🏏", "🏑", "🏒", "🥍", "🏓", "badminton", "🥊", "🥋", "🥅", "⛳", "⛸️", "🎣", "🤿", "🎽", "🎿", "🛷", "🥌", "🎯", "🪀", "🪁", "🎱", "🔮", "🪄", "🧿", "🎮", "🕹️", "🎰", "🎲", "🧩", "🧸", "♠️", "♥️", "♦️", "♣️", "♟️", "🃏", "🀄", "🎴", "🎭", "🖼️", "🎨", "🧵", "🧶"] },
    { id: "travel", label: "Travel", icon: "🚗", emojis: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🦯", "🦽", "🦼", "🛴", "🚲", "🛵", "🏍️", "🛺", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛥️", "🛳️", "⛴️", "🚢", "⚓", "🪝", "⛽", "🚧", "🚦", "🚥", "🚏", "🗺️", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲", "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏭", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🏛️", "⛪", "🕌", "🕍", "🛕", "🕋", "⛩️", "🛤️", "🛣️", "🗾", "🎑", "🏞️", "🌅", "🌄", "🌠", "🎇", "🎆", "🌇", "🌆", "🏙️", "🌃", "🌌", "🌉", "🌁"] },
    { id: "objects", label: "Objects", icon: "💡", emojis: ["⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "🪙", "💰", "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🪚", "🔩", "⚙️", "🪤", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🚬", "⚰️", "🪦", "⚱️", "🏺", "🔮", "📿", "🧿", "💈", "⚗️", "🔭", "🔬", "🕳️", "🩹", "🩺", "💊", "💉", "🩸", "🧬", "🦠", "🧫", "🧪", "🌡️", "🧹", "🪠", "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🛀", "🧼", "🪥", "🪒", "🧽", "🪣", "🧴", "🛎️", "🔑", "🗝️", "🚪", "🪑", "🛋️", "🛏️", "🛌", "🧸", "🪆", "🖼️", "🪞", "🪟", "🛍️", "🛒", "🎁", "🎈", "🎏", "🎀", "🪄", "🪅", "🎊", "🎉", "🎎", "🏮", "🎐", "🧧", "✉️", "📩", "📨", "📧", "💌", "📥", "📤", "📦", "🏷️", "🪧", "📪", "📫", "📬", "📭", "📮", "📯", "📜", "📃", "📄", "📑", "🧾", "📊", "📈", "📉", "🗒️", "🗓️", "📆", "📅", "🗑️", "📇", "🗃️", "🗳️", "🗄️", "📋", "📁", "📂", "🗂️", "🗞️", "📰", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "📖", "🔖", "🧷", "🔗", "📎", "🖇️", "📐", "📏", "🧮", "📌", "📍", "✂️", "🖊️", "🖋️", "✒️", "🖌️", "🖍️", "📝", "✏️", "🔍", "🔎", "🔏", "🔐", "🔒", "🔓"] },
    { id: "symbols", label: "Symbols", icon: "❤️", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "🚭", "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🛗", "🈳", "🈂️", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "ℹ️", "🔤", "🔡", "🔠", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "⏏️", "▶️", "⏸️", "⏯️", "⏹️", "⏺️", "⏭️", "⏮️", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃", "🎵", "🎶", "➕", "➖", "➗", "✖️", "♾️", "💲", "💱", "™️", "©️", "®️", "👁️‍🗨️", "🔚", "🔙", "🔛", "🔝", "🔜", "〰️", "➰", "➿", "✔️", "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜", "🔈", "🔇", "🔉", "🔊", "🔔", "🔕", "📣", "📢", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️", "🃏", "🎴", "🀄", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛", "🕜", "🕝", "🕞", "🕟", "🕠", "🕡", "🕢", "🕣", "🕤", "🕥", "🕦", "🕧"] },
    { id: "flags", label: "Flags", icon: "🏁", emojis: ["🏳️", "🏴", "🏁", "🚩", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇦🇫", "🇦🇽", "🇦🇱", "🇩🇿", "🇦🇸", "🇦🇩", "🇦🇴", "🇦🇮", "🇦🇶", "🇦🇬", "🇦🇷", "🇦🇲", "🇦🇼", "🇦🇺", "🇦🇹", "🇦🇿", "🇧🇸", "🇧🇭", "🇧🇩", "🇧🇧", "🇧🇾", "🇧🇪", "🇧🇿", "🇧🇯", "🇧🇲", "🇧🇹", "🇧🇴", "🇧🇦", "🇧🇼", "🇧🇷", "🇮🇴", "🇻🇬", "🇧🇳", "🇧🇬", "🇧🇫", "🇧🇮", "🇰🇭", "🇨🇲", "🇨🇦", "🇮🇨", "🇨🇻", "🇧🇶", "🇰🇾", "🇨🇫", "🇹🇩", "🇨🇱", "🇨🇳", "🇨🇽", "🇨🇨", "🇨🇴", "🇰🇲", "🇨🇬", "🇨🇩", "🇨🇰", "🇨🇷", "🇨🇮", "🇭🇷", "🇨🇺", "🇨🇼", "🇨🇾", "🇨🇿", "🇩🇰", "🇩🇯", "🇩🇲", "🇩🇴", "🇪🇨", "🇪🇬", "🇸🇻", "🇬🇶", "🇪🇷", "🇪🇪", "🇪🇹", "🇪🇺", "🇫🇰", "🇫🇴", "🇫🇯", "🇫🇮", "🇫🇷", "🇬🇫", "🇵🇫", "🇹🇫", "🇬🇦", "🇬🇲", "🇬🇪", "🇩🇪", "🇬🇭", "🇬🇮", "🇬🇷", "🇬🇱", "🇬🇩", "🇬🇵", "🇬🇺", "🇬🇹", "🇬🇬", "🇬🇳", "🇬🇼", "🇬🇾", "🇭🇹", "🇭🇳", "🇭🇰", "🇭🇺", "🇮🇸", "🇮🇳", "🇮🇩", "🇮🇷", "🇮🇶", "🇮🇪", "🇮🇲", "🇮🇱", "🇮🇹", "🇯🇲", "🇯🇵", "🎌", "🇯🇪", "🇯🇴", "🇰🇿", "🇰🇪", "🇰🇮", "🇽🇰", "🇰🇼", "🇰🇬", "🇱🇦", "🇱🇻", "🇱🇧", "🇱🇸", "🇱🇷", "🇱🇾", "🇱🇮", "🇱🇹", "🇱🇺", "🇲🇴", "🇲🇰", "🇲🇬", "🇲🇼", "🇲🇾", "🇲🇻", "🇲🇱", "🇲🇹", "🇲🇭", "🇲🇶", "🇲🇷", "🇲🇺", "🇾🇹", "🇲🇽", "🇫🇲", "🇲🇩", "🇲🇨", "🇲🇳", "🇲🇪", "🇲🇸", "🇲🇦", "🇲🇿", "🇲🇲", "🇳🇦", "🇳🇷", "🇳🇵", "🇳🇱", "🇳🇨", "🇳🇿", "🇳🇮", "🇳🇪", "🇳🇬", "🇳🇺", "🇳🇫", "🇰🇵", "🇲🇵", "🇳🇴", "🇴🇲", "🇵🇰", "🇵🇼", "🇵🇸", "🇵🇦", "🇵🇬", "🇵🇾", "🇵🇪", "🇵🇭", "🇵🇳", "🇵🇱", "🇵🇹", "🇵🇷", "🇶🇦", "🇷🇪", "🇷🇴", "🇷🇺", "🇷🇼", "🇼🇸", "🇸🇲", "🇸🇹", "🇸🇦", "🇸🇳", "🇸🇨", "🇸🇱", "🇸🇬", "🇸🇽", "🇸🇰", "🇸🇮", "🇬🇸", "🇸🇧", "🇸🇴", "🇿🇦", "🇰🇷", "🇸🇸", "🇪🇸", "🇱🇰", "🇧🇱", "🇸🇭", "🇰🇳", "🇱🇨", "🇵🇲", "🇻🇨", "🇸🇩", "🇸🇷", "🇸🇿", "🇸🇪", "🇨🇭", "🇸🇾", "🇹🇼", "🇹🇯", "🇹🇿", "🇹🇭", "🇹🇱", "🇹🇬", "🇹🇰", "🇹🇴", "🇹🇹", "🇹🇳", "🇹🇷", "🇹🇲", "🇹🇨", "🇹🇻", "🇺🇬", "🇺🇦", "🇦🇪", "🇬🇧", "🇺🇸", "🇺🇾", "🇺🇿", "🇻🇺", "🇻🇦", "🇻🇪", "🇻🇳", "🇼🇫", "🇪🇭", "🇾🇪", "🇿🇲", "🇿🇼", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "🏴󠁧󠁢󠁷󠁬󠁳󠁿"] },
];

export default function EmojiPicker({ value, onChange, className = "", guildId, trigger }: EmojiPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("people");
    const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
    const [hoveredEmoji, setHoveredEmoji] = useState<{ emoji: string, name: string } | null>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [mounted, setMounted] = useState(false);

    const pickerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch Custom Emojis
    useEffect(() => {
        if (guildId && isOpen) {
            fetch(`/api/emojis?guild_id=${guildId}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setCustomEmojis(data);
                    }
                })
                .catch(err => console.error("Failed to fetch emojis", err));
        }
    }, [guildId, isOpen]);

    // Click Outside Handling
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (emoji: string) => {
        onChange(emoji);
        setIsOpen(false);
        setSearch("");
    };

    const togglePicker = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let newTop = rect.bottom + 8; // Default to below trigger
            let newLeft = rect.right - 420; // Align right

            const pickerWidth = 420;
            const pickerHeight = 450;

            // Prevent going off left edge
            if (newLeft < 10) {
                newLeft = 10;
            }
            
            // Prevent going off right edge
            if (newLeft + pickerWidth > window.innerWidth - 10) {
                newLeft = window.innerWidth - pickerWidth - 10;
            }

            // Prevent going off bottom edge
            if (newTop + pickerHeight > window.innerHeight - 10) {
                // Show above trigger instead
                newTop = rect.top - pickerHeight - 8;
                // If it now goes off top edge, stick to viewport
                if (newTop < 10) {
                    newTop = 10;
                }
            }

            setCoords({
                top: newTop,
                left: newLeft
            });
        }
        setIsOpen(!isOpen);
    };

    // Scroll to category
    const scrollToCategory = (catId: string) => {
        setActiveCategory(catId);
        const element = document.getElementById(`emoji-cat-${catId}`);
        if (element && scrollRef.current) {
            scrollRef.current.scrollTo({ top: element.offsetTop - 10, behavior: "smooth" });
        }
    };

    // Filter Logic
    const filteredCategories = useMemo(() => {
        const term = search.toLowerCase();
        if (!term) return { categories: CATEGORIES, custom: customEmojis };

        const filteredStandard = CATEGORIES.map(cat => ({
            ...cat,
            emojis: cat.emojis.filter(e => e.includes(term)) // Naive check, ideally use keywords
        })).filter(cat => cat.emojis.length > 0);

        const filteredCustom = customEmojis.filter(e => e.name.toLowerCase().includes(term));

        return { categories: filteredStandard, custom: filteredCustom };
    }, [search, customEmojis]);

    // Handle Custom Input Enter
    const handleCustomInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSelect((e.target as HTMLInputElement).value);
        }
    };

    return (
        <div className={`relative ${className}`} ref={triggerRef}>
            {/* Trigger */}
            <div onClick={togglePicker} className="cursor-pointer">
                {trigger ? trigger : (
                    <button
                        type="button"
                        className="w-14 h-10 flex items-center justify-center text-xl bg-white/5 border border-white/10 rounded-lg hover:border-amber-500/50 hover:bg-white/10 transition"
                    >
                        {value.includes('<') ? <img src={`https://cdn.discordapp.com/emojis/${value.split(':')[2].slice(0, -1)}.png`} className="w-6 h-6" alt="emoji" /> : (value || "😀")}
                    </button>
                )}
            </div>

            {/* Picker Modal (Portaled) */}
            {isOpen && mounted && createPortal(
                <div 
                    ref={pickerRef}
                    style={{ top: coords.top, left: coords.left }}
                    className="fixed z-[10000] w-[420px] h-[450px] bg-[#2b2d31] rounded-lg shadow-2xl border border-white/10 overflow-hidden flex flex-col font-sans select-none animate-in fade-in zoom-in-95 duration-150"
                >
                    {/* Header: Search */}
                    <div className="p-4 bg-[#2b2d31] border-b border-white/10">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Find an emoji"
                            className="w-full px-3 py-2 bg-black/20 text-gray-200 rounded-[4px] text-sm placeholder-[#949BA4] focus:outline-none focus:ring-1 focus:ring-[#00A8FC]"
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar */}
                        <div className="w-12 bg-[#1e1f22] flex flex-col items-center gap-1 py-2 overflow-y-auto no-scrollbar border-r border-white/10">
                            {/* Custom Server Icon */}
                            {customEmojis.length > 0 && (
                                <button
                                    onClick={() => scrollToCategory('custom')}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition hover:bg-[#404249] ${activeCategory === 'custom' ? 'bg-[#404249] rounded-[10px]' : ''}`}
                                    title="Server Emojis"
                                >
                                    <span className="text-lg">🏰</span>
                                </button>
                            )}

                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => scrollToCategory(cat.id)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition hover:bg-[#404249] ${activeCategory === cat.id ? 'bg-[#404249] rounded-[10px]' : ''}`}
                                    title={cat.label}
                                >
                                    <span className="text-lg text-gray-200 grayscale hover:grayscale-0 transition">{cat.icon}</span>
                                </button>
                            ))}
                        </div>

                        {/* Emoji Grid */}
                        <div
                            className="flex-1 bg-[#2b2d31] overflow-y-auto custom-scrollbar px-2 relative"
                            ref={scrollRef}
                            onScroll={() => {
                                if (!scrollRef.current) return;
                                const container = scrollRef.current;
                                const containerTop = container.scrollTop;

                                // Check Custom Category
                                const customEl = document.getElementById('emoji-cat-custom');
                                if (customEl) {
                                    if (customEl.offsetTop <= containerTop + 50 && (customEl.offsetTop + customEl.offsetHeight) > containerTop) {
                                        setActiveCategory('custom');
                                        return;
                                    }
                                }

                                // Check Standard Categories
                                for (const cat of CATEGORIES) {
                                    const el = document.getElementById(`emoji-cat-${cat.id}`);
                                    if (el) {
                                        if (el.offsetTop <= containerTop + 50 && (el.offsetTop + el.offsetHeight) > containerTop) {
                                            setActiveCategory(cat.id);
                                            break;
                                        }
                                    }
                                }
                            }}
                        >
                            {/* Custom Emojis Section */}
                            {(search ? filteredCategories.custom.length > 0 : customEmojis.length > 0) && (
                                <div id="emoji-cat-custom" className="mb-4 mt-2">
                                    <h3 className="text-xs font-bold text-[#949BA4] uppercase mb-2 sticky top-0 bg-[#2b2d31] py-2 z-20 border-b border-white/10">
                                        Server Emojis
                                    </h3>
                                    <div className="grid grid-cols-7 gap-1 pt-1">
                                        {(search ? filteredCategories.custom : customEmojis).map(e => (
                                            <button
                                                key={e.id}
                                                onClick={() => handleSelect(`<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`)}
                                                onMouseEnter={() => setHoveredEmoji({ emoji: `https://cdn.discordapp.com/emojis/${e.id}.png`, name: `:${e.name}:` })}
                                                onMouseLeave={() => setHoveredEmoji(null)}
                                                className="w-10 h-10 flex items-center justify-center hover:bg-[#404249] rounded transition"
                                            >
                                                <img src={`https://cdn.discordapp.com/emojis/${e.id}.png`} alt={e.name} className="w-8 h-8 object-contain" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Standard Categories */}
                            {filteredCategories.categories.map(cat => (
                                <div key={cat.id} id={`emoji-cat-${cat.id}`} className="mb-4">
                                    <h3 className="text-xs font-bold text-[#949BA4] uppercase mb-2 sticky top-0 bg-[#2b2d31] py-2 z-20 border-b border-white/10">
                                        {cat.label}
                                    </h3>
                                    <div className="grid grid-cols-7 gap-1 pt-1">
                                        {cat.emojis.map((emoji) => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleSelect(emoji)}
                                                onMouseEnter={() => setHoveredEmoji({ emoji, name: emoji })}
                                                onMouseLeave={() => setHoveredEmoji(null)}
                                                className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-[#404249] rounded transition"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {search && filteredCategories.categories.length === 0 && filteredCategories.custom.length === 0 && (
                                <div className="text-center py-10 text-[#949BA4]">
                                    <div className="text-4xl mb-2">🤔</div>
                                    <p className="font-bold">No matching emojis found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / Hover Preview */}
                    <div className="h-12 bg-[#2b2d31] border-t border-white/10 flex items-center px-4 gap-3">
                        {hoveredEmoji ? (
                            <>
                                {hoveredEmoji.emoji.startsWith('http') ? (
                                    <img src={hoveredEmoji.emoji} className="w-8 h-8" alt="preview" />
                                ) : (
                                    <span className="text-3xl">{hoveredEmoji.emoji}</span>
                                )}
                                <span className="font-medium text-gray-200 text-sm">{hoveredEmoji.name}</span>
                            </>
                        ) : (
                            <div className="flex-1 flex gap-2 w-full">
                                <input
                                    type="text"
                                    placeholder="Or paste custom emoji string..."
                                    className="flex-1 bg-black/20 text-gray-200 text-xs px-2 py-1.5 rounded outline-none border border-transparent focus:border-[#00A8FC]"
                                    onKeyDown={handleCustomInput}
                                />
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}



