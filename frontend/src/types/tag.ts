export interface Tag {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

export interface CreateTagPayload {
  name: string;
  slug?: string;
}
