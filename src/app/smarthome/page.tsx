import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toggleSmartDevice, deleteSmartDevice, addSmartDevice } from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default async function SmartHomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const devices = await prisma.smartDevice.findMany({ orderBy: { room: 'asc' } });
  const rooms = Array.from(new Set(devices.map(d => d.room)));

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 transition">←</Link>
            <h1 className="text-3xl font-bold text-[#C5A38E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Smart Home</h1>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-stone-900 p-4 rounded-3xl border border-stone-800 flex items-center gap-4 shadow-xl">
              <div className="text-2xl">📺</div>
              <div><p className="text-[10px] text-stone-500 uppercase font-bold">Samsung GQ55Q60D</p><p className="text-xs text-white">Standby</p></div>
           </div>
           <div className="bg-stone-900 p-4 rounded-3xl border border-stone-800 flex items-center gap-4 shadow-xl">
              <div className="text-2xl">🧹</div>
              <div><p className="text-[10px] text-stone-500 uppercase font-bold">Xiaomi T12</p><p className="text-xs text-white">Dock (100%)</p></div>
           </div>
           <div className="bg-stone-900 p-4 rounded-3xl border border-stone-800 flex items-center gap-4 shadow-xl">
              <div className="text-2xl">🌈</div>
              <div><p className="text-[10px] text-stone-500 uppercase font-bold">Govee RGBIC</p><p className="text-xs text-white">Szenen bereit</p></div>
           </div>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 p-10 rounded-3xl border border-dashed border-stone-200 dark:border-stone-700 text-center">
            <p className="text-stone-500 italic">Noch keine Schalter in der Datenbank.</p>
          </div>
        ) : (
          rooms.map(room => (
            <section key={room} className="space-y-4">
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest pl-2">{room}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {devices.filter(d => d.room === room).map(device => (
                  <div key={device.id} className={`relative p-5 rounded-3xl border transition-all duration-500 flex flex-col justify-between h-36 group ${
                    device.isActive ? 'bg-stone-900 border-stone-700 shadow-[0_0_20px_rgba(197,163,142,0.3)]' : 'bg-white dark:bg-stone-900/50 border-stone-200 dark:border-stone-800'
                  }`}>
                    <div className="flex justify-between items-start">
                      <span className={`text-2xl ${device.isActive ? 'text-[#C5A38E]' : 'text-stone-400 grayscale'}`}>
                        {device.type === 'LIGHT' ? '💡' : device.type === 'VACUUM' ? '🧹' : device.type === 'TV' ? '📺' : '🔌'}
                      </span>
                      <form action={async () => { "use server"; await deleteSmartDevice(device.id); }}>
                        <button className="text-stone-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                      </form>
                    </div>
                    <div className="mt-auto flex justify-between items-end">
                      <div className="max-w-[70%]">
                        <p className={`font-bold text-[13px] truncate ${device.isActive ? 'text-white' : 'text-stone-600 dark:text-stone-300'}`}>{device.name}</p>
                        <p className="text-[9px] text-stone-500 uppercase truncate">{device.value || (device.isActive ? 'Aktiv' : 'Standby')}</p>
                      </div>
                      <form action={async () => { "use server"; await toggleSmartDevice(device.id, device.isActive); }}>
                        <button className={`w-9 h-5 rounded-full flex items-center transition-colors px-1 ${device.isActive ? 'bg-[#C5A38E] justify-end' : 'bg-stone-300 dark:bg-stone-700 justify-start'}`}>
                          <div className="w-3 h-3 rounded-full bg-white shadow-sm"></div>
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        <form action={async (formData) => { "use server"; await addSmartDevice(formData.get("name") as string, formData.get("type") as string, formData.get("room") as string); }} className="bg-stone-900 p-6 rounded-3xl shadow-xl flex flex-col gap-4 mt-8">
          <h2 className="text-[#C5A38E] text-xs uppercase font-bold tracking-widest">Neues Gerät anlegen</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input name="name" placeholder="Gerät (z.B. Govee H618F)" className="flex-1 bg-stone-800 text-white p-3 rounded-xl outline-none text-sm" required />
            <select name="type" className="bg-stone-800 text-white p-3 rounded-xl outline-none text-sm font-bold">
              <option value="LIGHT">💡 Licht</option>
              <option value="TV">📺 Smart TV</option>
              <option value="VACUUM">🧹 Saugroboter</option>
              <option value="PLUG">🔌 Steckdose</option>
            </select>
            <input name="room" placeholder="Raum (z.B. Wohnzimmer)" className="flex-1 bg-stone-800 text-white p-3 rounded-xl outline-none text-sm" required />
            <button type="submit" className="bg-[#C5A38E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#A38572] transition">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}