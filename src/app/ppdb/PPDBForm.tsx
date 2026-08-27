"use client";

import { useRef, useState } from "react";

/**
 * Form pendaftaran PPDB dua langkah: isi data -> tinjau (popup konfirmasi merangkum isian) ->
 * baru submit sungguhan. Tetap form POST biasa (bukan fetch/JSON) — popup cuma menahan submit
 * sejenak lewat client state, form yang di dalam popup itulah yang benar-benar mem-POST.
 */
export function PPDBForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [meninjau, setMeninjau] = useState(false);
  const [data, setData] = useState({ namaCalon: "", jenjangDaftar: "", namaOrtu: "", kontak: "" });

  function tinjau() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    const fd = new FormData(form);
    setData({
      namaCalon: String(fd.get("namaCalon") ?? ""),
      jenjangDaftar: String(fd.get("jenjangDaftar") ?? ""),
      namaOrtu: String(fd.get("namaOrtu") ?? ""),
      kontak: String(fd.get("kontak") ?? ""),
    });
    setMeninjau(true);
  }

  if (meninjau) {
    return (
      <form action="/api/ppdb" method="POST" className="bg-paper-raised border border-rule rounded-2xl p-7 flex flex-col gap-3.5">
        <h2 className="text-sm font-semibold mb-1">Tinjau data sebelum dikirim</h2>
        <dl className="flex flex-col gap-2 text-sm bg-paper border border-rule rounded-lg p-3.5">
          <Baris label="Nama calon siswa" value={data.namaCalon} />
          <Baris label="Jenjang/kelas" value={data.jenjangDaftar} />
          <Baris label="Nama orang tua/wali" value={data.namaOrtu} />
          <Baris label="Kontak" value={data.kontak} />
        </dl>
        <input type="hidden" name="namaCalon" value={data.namaCalon} />
        <input type="hidden" name="jenjangDaftar" value={data.jenjangDaftar} />
        <input type="hidden" name="namaOrtu" value={data.namaOrtu} />
        <input type="hidden" name="kontak" value={data.kontak} />
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => setMeninjau(false)}
            className="flex-1 border border-rule text-sm font-semibold py-2.5 rounded-lg"
          >
            ← Ubah data
          </button>
          <button type="submit" className="flex-1 bg-accent text-[#3A2C10] font-semibold text-sm py-2.5 rounded-lg">
            Ya, kirim pendaftaran
          </button>
        </div>
      </form>
    );
  }

  return (
    <form ref={formRef} className="bg-paper-raised border border-rule rounded-2xl p-7 flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Nama calon siswa</label>
        <input name="namaCalon" required className="bg-paper border border-rule rounded-lg px-3.5 py-2.5 text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Mendaftar untuk jenjang/kelas</label>
        <input name="jenjangDaftar" required placeholder="mis. Kelas 1" className="bg-paper border border-rule rounded-lg px-3.5 py-2.5 text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Nama orang tua/wali</label>
        <input name="namaOrtu" required className="bg-paper border border-rule rounded-lg px-3.5 py-2.5 text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Kontak (WhatsApp/email)</label>
        <input name="kontak" required className="bg-paper border border-rule rounded-lg px-3.5 py-2.5 text-sm" />
      </div>
      <button type="button" onClick={tinjau} className="bg-accent text-[#3A2C10] font-semibold text-sm py-2.5 rounded-lg mt-2">
        Tinjau Pendaftaran
      </button>
    </form>
  );
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold text-right">{value}</dd>
    </div>
  );
}
