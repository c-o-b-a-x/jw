import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import {
  buildImageUrl,
  fetchCategories,
  fetchSongs,
  formatCategoryLabel,
  SONGS_PER_PAGE,
  type Category,
  type Song,
} from "@/lib/api";

export default function HomeScreen() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    fetchCategories(controller.signal)
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSongs() {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchSongs({
          page,
          pageSize: SONGS_PER_PAGE,
          search: searchTerm,
          category: activeCategory,
          signal: controller.signal,
        });

        setSongs(data.results ?? []);
        if (!data.results?.length) {
          setError("No songs matched this search.");
        }
      } catch {
        setSongs([]);
        setError("The Juice WRLD API request failed.");
      } finally {
        setIsLoading(false);
      }
    }

    loadSongs();
    return () => controller.abort();
  }, [activeCategory, page, searchTerm]);

  function openSong(songId: number) {
    router.push(`/song/${songId}`);
  }

  const categoryValues = categories
    .map((category, index) => String(category.name ?? category.slug ?? category.value ?? index))
    .slice(0, 8);

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={songs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>Juice WRLD Mobile</Text>
              <Text style={styles.heroTitle}>Browse the archive from your phone.</Text>
              <Text style={styles.heroText}>
                Search songs, open track details, jump into the radio, and manage
                playlists in a dedicated Expo app.
              </Text>

              <View style={styles.shortcutRow}>
                <Pressable style={styles.shortcutButton} onPress={() => router.push("/radio")}>
                  <Text style={styles.shortcutTitle}>Radio</Text>
                  <Text style={styles.shortcutText}>Shuffle a station</Text>
                </Pressable>
                <Pressable
                  style={styles.shortcutButton}
                  onPress={() => router.push("/playlists")}
                >
                  <Text style={styles.shortcutTitle}>Playlists</Text>
                  <Text style={styles.shortcutText}>Save songs locally</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.searchCard}>
              <Text style={styles.sectionLabel}>Search songs</Text>
              <TextInput
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Search by title or artist"
                placeholderTextColor="#746d65"
                style={styles.searchInput}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                <Pressable
                  style={[styles.chip, activeCategory === "" && styles.chipActive]}
                  onPress={() => {
                    setActiveCategory("");
                    setPage(1);
                  }}
                >
                  <Text
                    style={[styles.chipText, activeCategory === "" && styles.chipTextActive]}
                  >
                    All songs
                  </Text>
                </Pressable>
                {categoryValues.map((value) => (
                  <Pressable
                    key={value}
                    style={[styles.chip, activeCategory === value && styles.chipActive]}
                    onPress={() => {
                      setActiveCategory(value);
                      setPage(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        activeCategory === value && styles.chipTextActive,
                      ]}
                    >
                      {formatCategoryLabel(value)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Tracks</Text>
              <View style={styles.pagerRow}>
                <Pressable
                  style={styles.pagerButton}
                  onPress={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                >
                  <Text style={styles.pagerText}>Prev</Text>
                </Pressable>
                <Text style={styles.pageLabel}>Page {page}</Text>
                <Pressable
                  style={styles.pagerButton}
                  onPress={() => setPage((currentPage) => currentPage + 1)}
                >
                  <Text style={styles.pagerText}>Next</Text>
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {isLoading ? <Text style={styles.loadingText}>Loading tracks...</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.songCard} onPress={() => openSong(item.id)}>
            <View style={styles.songArtwork}>
              {item.image_url ? (
                <Image source={{ uri: buildImageUrl(item.image_url) }} style={styles.songImage} />
              ) : (
                <View style={styles.songFallback}>
                  <Text style={styles.songFallbackText}>999</Text>
                </View>
              )}
            </View>

            <View style={styles.songInfo}>
              <Text style={styles.songTitle}>{item.name}</Text>
              <Text style={styles.songMeta}>{item.credited_artists || "Juice WRLD"}</Text>
              <View style={styles.songFooter}>
                <Text style={styles.songBadge}>
                  {formatCategoryLabel(item.category ?? "")}
                </Text>
                <Text style={styles.songMeta}>{item.length || "Unknown"}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#070809",
  },
  listContent: {
    padding: 18,
    gap: 14,
    paddingBottom: 140,
  },
  heroCard: {
    backgroundColor: "#11141a",
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  eyebrow: {
    color: "#ff914d",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
  },
  heroTitle: {
    color: "#f4eee5",
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "800",
  },
  heroText: {
    color: "#c9c2b7",
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  shortcutRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  shortcutButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 16,
  },
  shortcutTitle: {
    color: "#f4eee5",
    fontSize: 17,
    fontWeight: "700",
  },
  shortcutText: {
    color: "#a9a095",
    marginTop: 6,
  },
  searchCard: {
    backgroundColor: "#12151b",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  sectionLabel: {
    color: "#8e867b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 10,
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#f4eee5",
    marginBottom: 14,
  },
  chipRow: {
    gap: 10,
    paddingRight: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipActive: {
    backgroundColor: "#f36b21",
  },
  chipText: {
    color: "#c9c2b7",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#1a120d",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#f4eee5",
    fontSize: 24,
    fontWeight: "800",
  },
  pagerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pagerButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pagerText: {
    color: "#f4eee5",
    fontWeight: "700",
  },
  pageLabel: {
    color: "#8e867b",
    fontSize: 12,
  },
  errorText: {
    color: "#ffb07a",
    marginBottom: 12,
  },
  loadingText: {
    color: "#8e867b",
    marginBottom: 12,
  },
  songCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#11141a",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  songArtwork: {
    width: 78,
    height: 78,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1b1f26",
  },
  songImage: {
    width: "100%",
    height: "100%",
  },
  songFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  songFallbackText: {
    color: "#f36b21",
    fontWeight: "800",
  },
  songInfo: {
    flex: 1,
    justifyContent: "center",
  },
  songTitle: {
    color: "#f4eee5",
    fontSize: 17,
    fontWeight: "700",
  },
  songMeta: {
    color: "#a9a095",
    marginTop: 4,
  },
  songFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  songBadge: {
    color: "#ff914d",
    fontSize: 12,
    fontWeight: "700",
  },
});
