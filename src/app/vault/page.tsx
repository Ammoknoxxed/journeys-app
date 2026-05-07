// src/app/vault/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addVaultItem, deleteVaultItem } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import AppShell from "@/components/ui/AppShell";
import { FileDown, Link as LinkIcon, Lock, Trash2, Upload } from "lucide-react";

export default async function VaultPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const items = await prisma.vaultItem.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <AppShell title="Tresor" subtitle="Sensible Links und Dateien gemeinsam verwalten." backHref="/" maxWidthClassName="max-w-3xl">
      <div className="space-y-8">

        <section className="bg-stone-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-5"><Lock size={150} /></div>
          <h2 className="text-sm font-bold text-[#C5A38E] uppercase tracking-widest mb-6 relative z-10">Gemeinsame Dokumente & Links</h2>
          
          <div className="space-y-3 mb-8 relative z-10">
            {items.length === 0 ? (
              <p className="text-stone-500 italic text-sm">Der Tresor ist noch leer.</p>
            ) : (
              items.map(item => (
                <div key={item.id} className="flex justify-between items-center p-4 bg-stone-800/50 rounded-2xl border border-stone-700">
                  <div className="flex-1">
                    {item.fileData ? (
                      <a href={item.fileData} download={item.title} className="font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-2">
                        <FileDown size={16} /> {item.title}
                      </a>
                    ) : (
                      <a href={item.url || "#"} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-400 hover:text-blue-300 transition flex items-center gap-2">
                        <LinkIcon size={16} /> {item.title} ↗
                      </a>
                    )}
                    <p className="text-[10px] text-stone-400 mt-1">Hinzugefügt von {item.addedBy} am {item.createdAt.toLocaleDateString()}</p>
                  </div>
                  <form action={async () => { "use server"; await deleteVaultItem(item.id); }}>
                    <SubmitButton isIconOnly className="text-stone-500 hover:text-red-400 text-sm p-2 transition-colors"><Trash2 size={16}/></SubmitButton>
                  </form>
                </div>
              ))
            )}
          </div>

          <form action={addVaultItem} className="flex flex-col gap-4 bg-black/40 p-6 rounded-2xl relative z-10 border border-stone-700">
            <h3 className="text-xs uppercase text-stone-500 font-bold">Neues Dokument in den Tresor legen</h3>
            <input name="title" placeholder="Name des Dokuments (z.B. Mietvertrag 2026)" className="w-full bg-stone-800 border-none text-white text-sm px-4 py-3 rounded-xl outline-none" required />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-stone-800 p-3 rounded-xl border border-dashed border-stone-600">
                 <p className="text-[10px] text-stone-400 uppercase mb-2">Option A: Datei hochladen (PDF, Bilder)</p>
                 <label className="flex items-center gap-2 cursor-pointer bg-stone-700 hover:bg-stone-600 px-3 py-2 rounded-lg text-xs font-bold transition">
                   <Upload size={14} /> Datei auswählen
                   <input type="file" name="file" className="hidden" accept=".pdf,image/*,.doc,.docx" />
                 </label>
               </div>
               <div className="bg-stone-800 p-3 rounded-xl border border-dashed border-stone-600 flex flex-col justify-center">
                 <p className="text-[10px] text-stone-400 uppercase mb-2">Option B: Link (Google Drive, etc.)</p>
                 <input name="url" type="url" placeholder="https://..." className="w-full bg-stone-900 border-none text-white text-xs px-3 py-2 rounded-lg outline-none" />
               </div>
            </div>

            <SubmitButton className="bg-[#C5A38E] text-white px-6 py-3 mt-2 rounded-xl font-bold hover:bg-[#A38572] transition-colors w-full">In den Tresor legen</SubmitButton>
          </form>
        </section>

      </div>
    </AppShell>
  );
}