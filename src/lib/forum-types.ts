/** Client-safe forum payload types (no Prisma imports). */

export type ForumAuthorPublic = {
  name: string;
  avatarUrl?: string | null;
};

export function shapeForumAuthor(user: {
  name: string;
  avatarUrl?: string | null;
}): ForumAuthorPublic {
  return { name: user.name, avatarUrl: user.avatarUrl ?? null };
}

export type ForumPromptPostPayload = {
  id: string;
  isAuthor: boolean;
  post: {
    id: string;
    body: string;
    isAI: boolean;
    createdAt: string;
    editedAt: string | null;
    author: ForumAuthorPublic;
  };
  aiReply: {
    id: string;
    body: string;
    isAI: boolean;
    createdAt: string;
    editedAt: string | null;
    author: ForumAuthorPublic;
  } | null;
  aiThread: {
    id: string;
    body: string;
    isAI: boolean;
    createdAt: string;
    editedAt: string | null;
    author: ForumAuthorPublic;
  }[];
};
