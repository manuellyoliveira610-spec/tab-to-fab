import { useSyncExternalStore } from "react";

export type TxKind = "receita" | "despesa" | "investimento" | "meta" | "cartao";
export type Status = "Pago" | "Pendente";

export interface Transaction {
  id: string;
  date: string; // ISO yyyy-mm-dd
  description: string;
  kind: TxKind;
  type: string; // Fixo, Variável, Parcelado, À vista
  category: string;
  payment: string;
  status: Status;
  amount: number;
  isFixed?: boolean;
  installment?: number;
  installments?: number;
  parcelGroupId?: string;
  goalId?: string; // quando kind === "meta"
  cardId?: string; // quando kind === "cartao"
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  used: number;
  dueDate: string;
  status: Status;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
}

export type ThemeName =
  | "dark"
  | "light"
  | "pink"
  | "purple"
  | "blue"
  | "green"
  | "orange";

export interface Profile {
  name: string;
}

export interface FinanceState {
  transactions: Transaction[];
  cards: CreditCard[];
  goals: Goal[];
  profile: Profile;
  theme: ThemeName;
  lists: {
    categories: string[];
    investmentCategories: string[];
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
  goals: [],
  profile: { name: "" },
  theme: "dark",
  lists: {
    categories: ["Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Assinaturas", "Educação", "Outros"],
    investmentCategories: ["Reserva de emergência", "Meta", "Renda fixa", "Fundo imobiliário", "Ações", "Cripto", "Tesouro Direto", "Outros"],
    payments: ["Pix", "Débito", "Crédito", "Dinheiro", "Boleto", "Nubank", "Mercado Pago", "Inter"],
    investments: ["Emergência", "Reserva", "Metas", "Bolsa"],
    cards: ["Nubank", "Mercado Pago", "Inter"],
    goals: ["Carro", "Viagem", "Reforma", "iPhone"],
    types: ["Fixo", "Variável", "Parcelado", "À vista"],
    statuses: ["Pago", "Pendente"],
  },
};

function load(): FinanceState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      profile: { ...DEFAULTS.profile, ...(parsed.profile || {}) },
      lists: { ...DEFAULTS.lists, ...(parsed.lists || {}) },
    };
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
    // Aporte em meta: incrementa saved da meta
    if (tx.kind === "meta" && tx.goalId) {
      const g = state.goals.find((x) => x.id === tx.goalId);
      if (g) {
        state = {
          ...state,
          goals: state.goals.map((x) => (x.id === g.id ? { ...x, saved: x.saved + tx.amount } : x)),
        };
      }
    }
    // Compra no cartão: incrementa used do cartão
    if (tx.kind === "cartao" && tx.cardId) {
      const c = state.cards.find((x) => x.id === tx.cardId);
      if (c) {
        state = {
          ...state,
          cards: state.cards.map((x) => (x.id === c.id ? { ...x, used: x.used + tx.amount } : x)),
        };
      }
    }
    // Parcelamento
    if (
      (tx.kind === "despesa" || tx.kind === "cartao") &&
      tx.type === "Parcelado" &&
      tx.installments && tx.installments > 1 &&
      tx.installment && tx.installment >= 1
    ) {
      const groupId = crypto.randomUUID();
      const start = tx.installment;
      const total = tx.installments;
      const baseDate = new Date(tx.date + "T00:00:00");
      const newTxs: Transaction[] = [];
      for (let i = start; i <= total; i++) {
        const offset = i - start;
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + offset);
        newTxs.push({
          ...tx,
          id: crypto.randomUUID(),
          date: d.toISOString().slice(0, 10),
          installment: i,
          installments: total,
          parcelGroupId: groupId,
          status: offset === 0 ? tx.status : "Pendente",
        });
      }
      state = { ...state, transactions: [...newTxs, ...state.transactions] };
      save();
      return;
    }
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
  removeParcelGroup(groupId: string) {
    state = { ...state, transactions: state.transactions.filter((t) => t.parcelGroupId !== groupId) };
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
  addGoal(g: Omit<Goal, "id">) {
    state = { ...state, goals: [...state.goals, { ...g, id: crypto.randomUUID() }] };
    save();
  },
  updateGoal(id: string, patch: Partial<Goal>) {
    state = { ...state, goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) };
    save();
  },
  removeGoal(id: string) {
    state = { ...state, goals: state.goals.filter((g) => g.id !== id) };
    save();
  },
  setProfile(p: Partial<Profile>) {
    state = { ...state, profile: { ...state.profile, ...p } };
    save();
  },
  setTheme(t: ThemeName) {
    state = { ...state, theme: t };
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
  return iso.slice(0, 7);
}

export function yearKey(iso: string) {
  return iso.slice(0, 4);
}
