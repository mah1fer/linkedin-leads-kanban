import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ContactList } from "@/components/contacts/ContactList";

export default function Home() {
  return (
    <main className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-64 w-full h-full relative">
        <Header />
        <ContactList />
      </div>
    </main>
  );
}
