-- CreateTable
CREATE TABLE "TanyaJawabKelas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "anonim" BOOLEAN NOT NULL DEFAULT false,
    "isi" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TanyaJawabKelas_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TanyaJawabKelas_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TanyaJawabKelas_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TanyaJawabKelas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TanyaJawabKelas" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

