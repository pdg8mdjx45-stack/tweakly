/**
 * Bookmarks Hook
 * Manages article bookmarking with AsyncStorage persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export interface Bookmark {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  url: string;
  category: string;
  savedAt: string; // ISO string so JSON round-trips cleanly
}

interface BookmarksContextType {
  bookmarks: Bookmark[];
  isBookmarked: (id: string) => boolean;
  addBookmark: (bookmark: Omit<Bookmark, 'savedAt'>) => void;
  removeBookmark: (id: string) => void;
  toggleBookmark: (bookmark: Omit<Bookmark, 'savedAt'>) => void;
  clearBookmarks: () => void;
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined);

const STORAGE_KEY = 'tweakly-bookmarks-v2';

export function BookmarksProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed: Bookmark[] = JSON.parse(raw);
          setBookmarks(parsed);
        }
      })
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

  // Persist whenever bookmarks change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks)).catch(console.error);
  }, [bookmarks, loaded]);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks],
  );

  const addBookmark = useCallback((bookmark: Omit<Bookmark, 'savedAt'>) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.id === bookmark.id)) return prev;
      return [{ ...bookmark, savedAt: new Date().toISOString() }, ...prev];
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const toggleBookmark = useCallback(
    (bookmark: Omit<Bookmark, 'savedAt'>) => {
      if (isBookmarked(bookmark.id)) {
        removeBookmark(bookmark.id);
      } else {
        addBookmark(bookmark);
      }
    },
    [isBookmarked, removeBookmark, addBookmark],
  );

  const clearBookmarks = useCallback(() => setBookmarks([]), []);

  return React.createElement(
    BookmarksContext.Provider,
    { value: { bookmarks, isBookmarked, addBookmark, removeBookmark, toggleBookmark, clearBookmarks } },
    children,
  );
}

export function useBookmarks(): BookmarksContextType {
  const ctx = useContext(BookmarksContext);
  if (!ctx) throw new Error('useBookmarks must be used within a BookmarksProvider');
  return ctx;
}

/** Convenience hook for a single article card */
export function useArticleBookmark(article: {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  url: string;
  category: string;
}) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(article.id);
  const handleToggle = useCallback(() => toggleBookmark(article), [toggleBookmark, article]);
  return { bookmarked, toggleBookmark: handleToggle };
}
