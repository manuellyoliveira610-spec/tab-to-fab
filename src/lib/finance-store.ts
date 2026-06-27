import { useSyncExternalStore } from "react";

export type TxKind = "receita" | "despesa" | "investimento";
export type Status = "Pago" | "Pendente";

export interface Transaction {
  id: string;
  date: string; // ISO yyyy-mm-dd
  description: string;
  kind: TxKind;
  type: string; // Fixo, Variável, Parcelado, etc.
  category: string;
  payment: string;
  status: Status;
  amount: number;
  isFixed?: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  used: number;
  dueDate: string; // ISO
  status: Status;
}

export interface FinanceState {
  transactions: Transaction[];
  cards: CreditCard[];
  lists: {
    categories: string[];
    payments: string[];
    investments: string[];
    cards: string[];
    goals: string[];
    types: string[];
    statuses: Status[];
  };
}

const KEY = "controle_financeiro_v1";

const DEFAULTS: FinanceState = {
  transactions: [],
  cards: [],
  lists: {
    categories: ["Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Assinaturas", "Educação", "Outros"],
    payments: ["Pix", "Débito", "Crédito", "Dinheiro", "Boleto", "Nubank", "Mercado Pago", "Inter"],
    investments: ["Emergência", "Reserva", "Metas", "Bolsa"],
    cards: ["Nubank", "Mercado Pago", "Inter"],
    goals: ["Carro", "Viagem", "Reforma", "iPhone"],
    types: ["Fixo", "Variável", "Parcelado"],
    statuses: ["Pago", "Pendente"],
  },
};

function load(): FinanceState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed, lists: { ...DEFAULTS.lists, ...(parsed.lists || {}) } };
  } catch {
    return DEFAULTS;
  }
}

let state: FinanceState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

export const store = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  addTransaction(tx: Omit<Transaction, "id">) {
    state = { ...state, transactions: [{ ...tx, id: crypto.randomUUID() }, ...state.transactions] };
    save();
  },
  updateTransaction(id: string, patch: Partial<Transaction>) {
    state = {
      ...state,
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    };
    save();
  },
  removeTransaction(id: string) {
    state = { ...state, transactions: state.transactions.filter((t) => t.id !== id) };
    save();
  },
  addCard(c: Omit<CreditCard, "id">) {
    state = { ...state, cards: [...state.cards, { ...c, id: crypto.randomUUID() }] };
    save();
  },
  updateCard(id: string, patch: Partial<CreditCard>) {
    state = { ...state, cards: state.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
    save();
  },
  removeCard(id: string) {
    state = { ...state, cards: state.cards.filter((c) => c.id !== id) };
    save();
  },
  updateList<K extends keyof FinanceState["lists"]>(key: K, values: FinanceState["lists"][K]) {
    state = { ...state, lists: { ...state.lists, [key]: values } };
    save();
  },
  reset() {
    state = DEFAULTS;
    save();
  },
};

export function useFinance(): FinanceState {
  return useSyncExternalStore(
    store.subscribe,
    () => state,
    () => DEFAULTS,
  );
}

export function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function monthKey(iso: string) {
  // returns "YYYY-MM"
  return iso.slice(0, 7);
}
