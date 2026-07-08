import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

type PerformanceProfile = 'low' | 'mid' | 'high';

type RomItem = {
  id: string;
  name: string;
  uri: string;
  extension: string;
  source: 'imported' | 'downloaded';
  addedAt: number;
};

type CatalogItem = {
  id: string;
  name: string;
  url: string;
  system?: string;
};

const STORAGE_LIBRARY_KEY = 'playmon.library';
const STORAGE_PROFILE_KEY = 'playmon.performanceProfile';
const STORAGE_CATALOG_URL_KEY = 'playmon.catalogUrl';
const ROM_DIRECTORY = `${FileSystem.documentDirectory ?? ''}roms/`;

const DEFAULT_CATALOG_URL =
  'https://raw.githubusercontent.com/EmulatorJS/EmulatorJS/main/catalog.sample.json';

const FALLBACK_CATALOG: CatalogItem[] = [
  {
    id: 'sample-1',
    name: 'Sample GBA ROM (replace with your third-party catalog URL)',
    url: 'https://example.com/sample.gba',
    system: 'gba',
  },
];

const CORE_BY_EXT: Record<string, string> = {
  gba: 'gba',
  gb: 'gb',
  gbc: 'gb',
  nes: 'nes',
  sfc: 'snes',
  smc: 'snes',
  snes: 'snes',
  n64: 'n64',
  z64: 'n64',
  nds: 'nds',
};

const PROFILE_SETTINGS: Record<
  PerformanceProfile,
  { speed: number; threads: boolean; label: string }
> = {
  low: { speed: 0.95, threads: false, label: 'Low-end (battery saver)' },
  mid: { speed: 1, threads: true, label: 'Balanced (default)' },
  high: { speed: 1.05, threads: true, label: 'High-end (enhanced)' },
};

function getExtension(filename: string): string {
  const value = filename.split('.').pop()?.toLowerCase() ?? '';
  return value.replace(/[^a-z0-9]/g, '');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeCatalog(raw: unknown): CatalogItem[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && 'items' in raw && Array.isArray((raw as { items: unknown }).items)
      ? ((raw as { items: unknown[] }).items ?? [])
      : [];

  return list
    .filter(
      (item): item is { name: string; url: string; system?: string } =>
        Boolean(item && typeof item === 'object' && (item as { name?: unknown }).name && (item as { url?: unknown }).url),
    )
    .map((item) => ({
      id: `${item.name}-${item.url}`,
      name: item.name,
      url: item.url,
      system: item.system,
    }));
}

function emulatorHtml(base64Rom: string, core: string, profile: PerformanceProfile): string {
  const settings = PROFILE_SETTINGS[profile];
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
  <style>
    html, body, #game { margin: 0; height: 100%; width: 100%; background: #000; overflow: hidden; }
  </style>
</head>
<body>
  <div id="game"></div>
  <script>
    window.EJS_player = '#game';
    window.EJS_core = '${core}';
    window.EJS_gameUrl = 'data:application/octet-stream;base64,${base64Rom}';
    window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
    window.EJS_startOnLoaded = true;
    window.EJS_AdUrl = '';
    window.EJS_threads = ${settings.threads ? 'true' : 'false'};
    window.EJS_speed = ${settings.speed};
  </script>
  <script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script>
</body>
</html>`;
}

export default function App() {
  const [library, setLibrary] = useState<RomItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>(FALLBACK_CATALOG);
  const [catalogUrl, setCatalogUrl] = useState(DEFAULT_CATALOG_URL);
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState<PerformanceProfile>('mid');
  const [loading, setLoading] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerHtml, setPlayerHtml] = useState('');
  const [playerTitle, setPlayerTitle] = useState('');

  useEffect(() => {
    const bootstrap = async () => {
      await FileSystem.makeDirectoryAsync(ROM_DIRECTORY, { intermediates: true }).catch(() => undefined);

      const [savedLibrary, savedProfile, savedCatalogUrl] = await Promise.all([
        AsyncStorage.getItem(STORAGE_LIBRARY_KEY),
        AsyncStorage.getItem(STORAGE_PROFILE_KEY),
        AsyncStorage.getItem(STORAGE_CATALOG_URL_KEY),
      ]);

      if (savedLibrary) {
        try {
          setLibrary(JSON.parse(savedLibrary) as RomItem[]);
        } catch {
          setLibrary([]);
        }
      }
      if (savedProfile === 'low' || savedProfile === 'mid' || savedProfile === 'high') {
        setProfile(savedProfile);
      }
      if (savedCatalogUrl) {
        setCatalogUrl(savedCatalogUrl);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE_PROFILE_KEY, profile);
  }, [profile]);

  const filteredCatalog = useMemo(
    () => catalog.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [catalog, search],
  );

  const filteredLibrary = useMemo(
    () => library.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [library, search],
  );

  const refreshCatalog = async () => {
    const value = catalogUrl.trim();
    if (!value) {
      Alert.alert('Catalog URL required', 'Provide a valid third-party catalog URL.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(value);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const parsed = normalizeCatalog(await response.json());
      if (!parsed.length) {
        throw new Error('No ROM entries found in catalog payload.');
      }
      setCatalog(parsed);
      await AsyncStorage.setItem(STORAGE_CATALOG_URL_KEY, value);
      Alert.alert('Catalog updated', `Loaded ${parsed.length} ROM entries.`);
    } catch (error) {
      Alert.alert('Catalog fetch failed', `Using fallback catalog. ${String(error)}`);
      setCatalog(FALLBACK_CATALOG);
    } finally {
      setLoading(false);
    }
  };

  const addToLibrary = (rom: RomItem) => {
    setLibrary((prev) => {
      const withoutDuplicate = prev.filter((item) => item.uri !== rom.uri);
      return [rom, ...withoutDuplicate].sort((a, b) => b.addedAt - a.addedAt);
    });
  };

  const importRom = async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const selected = result.assets[0];
      const name = selected.name || `rom-${Date.now()}`;
      const extension = getExtension(name);
      if (!CORE_BY_EXT[extension]) {
        Alert.alert('Unsupported ROM', `.${extension || 'unknown'} is not currently supported.`);
        return;
      }

      const targetUri = `${ROM_DIRECTORY}${Date.now()}-${sanitizeFilename(name)}`;
      await FileSystem.copyAsync({ from: selected.uri, to: targetUri });

      addToLibrary({
        id: targetUri,
        name,
        uri: targetUri,
        extension,
        source: 'imported',
        addedAt: Date.now(),
      });
      Alert.alert('ROM imported', `${name} was added to your local library.`);
    } catch (error) {
      Alert.alert('Import failed', String(error));
    } finally {
      setLoading(false);
    }
  };

  const downloadCatalogRom = async (item: CatalogItem, playAfter: boolean) => {
    setLoading(true);
    try {
      const extension = item.system?.toLowerCase() || getExtension(item.url);
      if (!CORE_BY_EXT[extension]) {
        Alert.alert('Unsupported ROM', `Unable to match a core for ${item.name}.`);
        return;
      }

      const filename = sanitizeFilename(`${Date.now()}-${item.name}.${extension}`);
      const targetUri = `${ROM_DIRECTORY}${filename}`;
      const result = await FileSystem.downloadAsync(item.url, targetUri);

      const rom: RomItem = {
        id: result.uri,
        name: item.name,
        uri: result.uri,
        extension,
        source: 'downloaded',
        addedAt: Date.now(),
      };

      addToLibrary(rom);

      if (playAfter) {
        await playRom(rom);
      } else {
        Alert.alert('ROM downloaded', `${item.name} is ready in your local library.`);
      }
    } catch (error) {
      Alert.alert('Download failed', String(error));
    } finally {
      setLoading(false);
    }
  };

  const playRom = async (rom: RomItem) => {
    const core = CORE_BY_EXT[rom.extension.toLowerCase()];
    if (!core) {
      Alert.alert('Unsupported ROM', `No emulator core mapped for .${rom.extension}.`);
      return;
    }

    setLoading(true);
    try {
      const info = await FileSystem.getInfoAsync(rom.uri);
      if (!info.exists) {
        Alert.alert('Missing ROM', `${rom.name} no longer exists on disk.`);
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(rom.uri, { encoding: FileSystem.EncodingType.Base64 });
      setPlayerTitle(rom.name);
      setPlayerHtml(emulatorHtml(base64, core, profile));
      setPlayerVisible(true);
    } catch (error) {
      Alert.alert('Playback failed', String(error));
    } finally {
      setLoading(false);
    }
  };

  const deleteRom = (rom: RomItem) => {
    Alert.alert('Delete ROM', `Remove ${rom.name} from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await FileSystem.deleteAsync(rom.uri, { idempotent: true }).catch(() => undefined);
          setLibrary((prev) => prev.filter((item) => item.id !== rom.id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Playmon MVP</Text>
      <Text style={styles.subtitle}>ROM catalog, download/import, and direct play in one app.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Profile</Text>
        <View style={styles.profileRow}>
          {(['low', 'mid', 'high'] as PerformanceProfile[]).map((item) => (
            <Pressable
              key={item}
              style={[styles.profileButton, profile === item && styles.profileButtonActive]}
              onPress={() => setProfile(item)}
            >
              <Text style={styles.profileButtonText}>{PROFILE_SETTINGS[item].label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Catalog Source</Text>
        <TextInput
          value={catalogUrl}
          onChangeText={setCatalogUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://.../catalog.json"
          style={styles.input}
        />
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={refreshCatalog}>
            <Text style={styles.buttonText}>Refresh Catalog</Text>
          </Pressable>
          <Pressable style={styles.buttonSecondary} onPress={importRom}>
            <Text style={styles.buttonText}>Import ROM</Text>
          </Pressable>
        </View>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        placeholder="Search catalog and library"
        style={styles.input}
      />

      {loading && <ActivityIndicator size="large" color="#7f5af0" style={styles.loader} />}

      <ScrollView style={styles.list}>
        <Text style={styles.listHeader}>Catalog ({filteredCatalog.length})</Text>
        {filteredCatalog.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>System: {(item.system ?? getExtension(item.url) ?? 'unknown').toUpperCase()}</Text>
            <View style={styles.row}>
              <Pressable style={styles.button} onPress={() => downloadCatalogRom(item, false)}>
                <Text style={styles.buttonText}>Download</Text>
              </Pressable>
              <Pressable style={styles.buttonSecondary} onPress={() => downloadCatalogRom(item, true)}>
                <Text style={styles.buttonText}>Download + Play</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Text style={styles.listHeader}>Local Library ({filteredLibrary.length})</Text>
        {filteredLibrary.map((rom) => (
          <View key={rom.id} style={styles.card}>
            <Text style={styles.cardTitle}>{rom.name}</Text>
            <Text style={styles.cardMeta}>
              {rom.source} • .{rom.extension} • {new Date(rom.addedAt).toLocaleString()}
            </Text>
            <View style={styles.row}>
              <Pressable style={styles.button} onPress={() => void playRom(rom)}>
                <Text style={styles.buttonText}>Play</Text>
              </Pressable>
              <Pressable style={styles.buttonDanger} onPress={() => deleteRom(rom)}>
                <Text style={styles.buttonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={playerVisible} animationType="slide" onRequestClose={() => setPlayerVisible(false)}>
        <View style={styles.playerHeader}>
          <Text style={styles.playerTitle}>{playerTitle}</Text>
          <Pressable style={styles.buttonDanger} onPress={() => setPlayerVisible(false)}>
            <Text style={styles.buttonText}>Close</Text>
          </Pressable>
        </View>
        {playerHtml ? (
          <WebView
            source={{ html: playerHtml }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            allowFileAccess
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
          />
        ) : (
          <View style={styles.loaderFallback}>
            <ActivityIndicator size="large" color="#7f5af0" />
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16161a',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  title: {
    color: '#fffffe',
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a1b2',
    marginTop: 4,
    marginBottom: 12,
  },
  section: {
    backgroundColor: '#242629',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fffffe',
    fontWeight: '600',
    marginBottom: 8,
  },
  profileRow: {
    gap: 8,
  },
  profileButton: {
    backgroundColor: '#2f3136',
    borderRadius: 8,
    padding: 8,
  },
  profileButtonActive: {
    backgroundColor: '#7f5af0',
  },
  profileButtonText: {
    color: '#fffffe',
    fontSize: 12,
  },
  input: {
    backgroundColor: '#242629',
    color: '#fffffe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    backgroundColor: '#7f5af0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#2cb67d',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  buttonDanger: {
    backgroundColor: '#ef4565',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fffffe',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 12,
  },
  list: {
    flex: 1,
    marginBottom: 12,
  },
  listHeader: {
    color: '#fffffe',
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '700',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#242629',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    color: '#fffffe',
    fontWeight: '700',
  },
  cardMeta: {
    color: '#94a1b2',
    fontSize: 12,
  },
  playerHeader: {
    paddingTop: 52,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#16161a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  playerTitle: {
    color: '#fffffe',
    fontWeight: '700',
    flex: 1,
  },
  loaderFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
