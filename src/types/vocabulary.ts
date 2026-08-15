export interface VocabularyList {
  id: string;
  name: string;
  createdAt: number;
}

export interface VocabularyItem {
  id: string;
  listId: string;
  japanese: string;
  kana: string;
  romaji: string;
  englishMeanings: string[];
  pos: string[];
  tags: string[];
  notes: string;
  favorite: boolean;
  createdAt: number;
}
