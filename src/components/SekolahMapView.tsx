"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ikon marker default leaflet rusak dgn bundler (path relatif ke aset webpack) — pola umum:
// timpa dgn URL CDN yg sama dgn tile OSM (jaringan pihak ketiga sudah diterima utk peta, 1.20).
function useFixDefaultIcon() {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);
}

type SekolahTitik = {
  id: string;
  nama: string;
  jenjang: string;
  kabupatenKota: string | null;
  provinsi: string | null;
  latitude: number;
  longitude: number;
};

/** Peta sebaran sekolah (1.20) — cuma render marker yg sudah punya lat/long terisi. */
export function SekolahMapView({ sekolahList }: { sekolahList: SekolahTitik[] }) {
  useFixDefaultIcon();

  if (sekolahList.length === 0) {
    return (
      <div className="bg-paper-raised border border-rule rounded-xl p-8 text-center text-sm text-ink-soft">
        Belum ada sekolah dengan koordinat lat/long terisi.
      </div>
    );
  }

  const center: [number, number] = [sekolahList[0].latitude, sekolahList[0].longitude];

  return (
    <div className="border border-rule rounded-xl overflow-hidden" style={{ height: 480 }}>
      <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {sekolahList.map((s) => (
          <Marker key={s.id} position={[s.latitude, s.longitude]}>
            <Popup>
              <div className="text-sm">
                <b>{s.nama}</b>
                <br />
                {s.jenjang} · {s.kabupatenKota ?? "—"}, {s.provinsi ?? "—"}
                <br />
                <a href={`/superadmin/sekolah/${s.id}`} className="text-primary-deep font-semibold hover:underline">
                  Lihat detail →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
