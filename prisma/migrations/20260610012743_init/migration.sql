-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL DEFAULT 'Default User',
    "preferredRegion" TEXT NOT NULL DEFAULT 'US',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MonitoredShow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "posterPath" TEXT,
    "status" TEXT,
    "preferredRegion" TEXT NOT NULL DEFAULT 'US',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonitoredShow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShowTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "monitoredShowId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    CONSTRAINT "ShowTag_monitoredShowId_fkey" FOREIGN KEY ("monitoredShowId") REFERENCES "MonitoredShow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShowTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EpisodeCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tmdbShowId" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "airDate" DATETIME,
    "stillPath" TEXT,
    "overview" TEXT,
    "refreshedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShowCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tmdbId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "status" TEXT,
    "overview" TEXT,
    "lastAirDate" DATETIME,
    "nextEpisodeName" TEXT,
    "nextEpisodeAirDate" DATETIME,
    "nextSeason" INTEGER,
    "nextEpisode" INTEGER,
    "refreshedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WatchProvidersCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tmdbShowId" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "providersJson" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'tmdb',
    "refreshedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WatchedEpisode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "tmdbShowId" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,
    "watchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monitoredShowId" INTEGER,
    CONSTRAINT "WatchedEpisode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchedEpisode_monitoredShowId_fkey" FOREIGN KEY ("monitoredShowId") REFERENCES "MonitoredShow" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredShow_userId_tmdbId_key" ON "MonitoredShow"("userId", "tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ShowTag_monitoredShowId_tagId_key" ON "ShowTag"("monitoredShowId", "tagId");

-- CreateIndex
CREATE INDEX "EpisodeCache_tmdbShowId_idx" ON "EpisodeCache"("tmdbShowId");

-- CreateIndex
CREATE INDEX "EpisodeCache_airDate_idx" ON "EpisodeCache"("airDate");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeCache_tmdbShowId_season_episode_key" ON "EpisodeCache"("tmdbShowId", "season", "episode");

-- CreateIndex
CREATE UNIQUE INDEX "ShowCache_tmdbId_key" ON "ShowCache"("tmdbId");

-- CreateIndex
CREATE INDEX "WatchProvidersCache_tmdbShowId_idx" ON "WatchProvidersCache"("tmdbShowId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchProvidersCache_tmdbShowId_region_source_key" ON "WatchProvidersCache"("tmdbShowId", "region", "source");

-- CreateIndex
CREATE INDEX "WatchedEpisode_userId_tmdbShowId_idx" ON "WatchedEpisode"("userId", "tmdbShowId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedEpisode_userId_tmdbShowId_season_episode_key" ON "WatchedEpisode"("userId", "tmdbShowId", "season", "episode");
