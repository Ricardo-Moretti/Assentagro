import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combina classes Tailwind com merge inteligente
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formata data ISO para pt-BR (ex: 21/02/2026)
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

// Formata data+hora ISO para pt-BR (ex: 21/02/2026 14:30)
export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// Formata capacidade de armazenamento para exibição
export function formatStorage(gb: number): string {
  if (gb >= 1000) {
    return `${(gb / 1000).toFixed(gb % 1000 === 0 ? 0 : 1)} TB`;
  }
  return `${gb} GB`;
}
