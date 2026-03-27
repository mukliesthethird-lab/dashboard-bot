import ProfileSettings from "@/components/ProfileSettings";
import Navbar from "@/components/Navbar";

export default function Page() {
    return (
        <main className="min-h-screen bg-[#05050a] text-white selection:bg-indigo-500/30">
            <Navbar />
            <div className="pt-24">
                <ProfileSettings />
            </div>
        </main>
    );
}
