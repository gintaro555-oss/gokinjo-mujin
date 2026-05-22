/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type Member = { id: string; name: string };

type YearSetting = {
  fiscal_year: number;
  monthly_amount: number;
  carryover_amount: number;
};

type Payment = {
  id: string;
  member_id: string;
  fiscal_year: number;
  month: number;
  amount: number;
  paid_at: string;
};

type Expense = {
  id: string;
  title: string;
  amount: number;
  fiscal_year: number;
  month: number;
};

type Advance = {
  id: string;
  payer_member_id: string;
  target_member_id: string;
  amount: number;
  memo: string | null;
  is_settled: boolean;
};

type UsageMemo = {
  id: string;
  memo: string;
};

const DEFAULT_FISCAL_YEAR = 2026;
const FISCAL_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

function getCurrentMonth() {
  return new Date().getMonth() + 1;
}

export default function Home() {
  const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD;

  const [inputPassword, setInputPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [fiscalYears, setFiscalYears] = useState<YearSetting[]>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] =
    useState(DEFAULT_FISCAL_YEAR);
  const [setting, setSetting] = useState<YearSetting | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [usageMemos, setUsageMemos] = useState<UsageMemo[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const [payerMemberId, setPayerMemberId] = useState("");
  const [targetMemberId, setTargetMemberId] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceMemo, setAdvanceMemo] = useState("");

  const [usageMemo, setUsageMemo] = useState("");

  const [editMonthlyAmount, setEditMonthlyAmount] = useState("");
  const [editCarryoverAmount, setEditCarryoverAmount] = useState("");
  const [newFiscalYear, setNewFiscalYear] = useState(DEFAULT_FISCAL_YEAR + 1);
  const [newMonthlyAmount, setNewMonthlyAmount] = useState("3000");
  const [newCarryoverAmount, setNewCarryoverAmount] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("mujin-auth");
    if (saved === "ok") setAuthenticated(true);
  }, []);

  function handleLogin() {
    if (inputPassword === APP_PASSWORD) {
      localStorage.setItem("mujin-auth", "ok");
      setAuthenticated(true);
    } else {
      alert("パスワードが違います");
    }
  }

  async function fetchData(year = selectedFiscalYear) {
    setLoading(true);

    const [
      membersRes,
      fiscalYearsRes,
      settingRes,
      paymentsRes,
      expensesRes,
      advancesRes,
      memosRes,
    ] = await Promise.all([
      supabase.from("mujin_members").select("id, name").order("created_at"),
      supabase
        .from("mujin_fiscal_years")
        .select("fiscal_year, monthly_amount, carryover_amount")
        .order("fiscal_year", { ascending: true }),
      supabase
        .from("mujin_fiscal_years")
        .select("fiscal_year, monthly_amount, carryover_amount")
        .eq("fiscal_year", year)
        .single(),
      supabase
        .from("mujin_payments")
        .select("id, member_id, fiscal_year, month, amount, paid_at")
        .eq("fiscal_year", year),
      supabase
        .from("mujin_expenses")
        .select("id, title, amount, fiscal_year, month")
        .eq("fiscal_year", year)
        .order("spent_at", { ascending: false }),
      supabase
        .from("mujin_advances")
        .select("id, payer_member_id, target_member_id, amount, memo, is_settled")
        .eq("fiscal_year", year)
        .order("created_at", { ascending: false }),
      supabase
        .from("mujin_usage_memos")
        .select("id, memo")
        .eq("fiscal_year", year)
        .order("created_at", { ascending: false }),
    ]);

    if (membersRes.error) console.error("members error", membersRes.error);
    if (fiscalYearsRes.error)
      console.error("fiscal years error", fiscalYearsRes.error);
    if (settingRes.error) console.error("setting error", settingRes.error);
    if (paymentsRes.error) console.error("payments error", paymentsRes.error);
    if (expensesRes.error) console.error("expenses error", expensesRes.error);
    if (advancesRes.error) console.error("advances error", advancesRes.error);
    if (memosRes.error) console.error("memos error", memosRes.error);

    if (membersRes.data) setMembers(membersRes.data);
    if (fiscalYearsRes.data) setFiscalYears(fiscalYearsRes.data);
    if (settingRes.data) {
      setSetting(settingRes.data);
      setEditMonthlyAmount(String(settingRes.data.monthly_amount));
      setEditCarryoverAmount(String(settingRes.data.carryover_amount));
    }
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
    if (advancesRes.data) setAdvances(advancesRes.data);
    if (memosRes.data) setUsageMemos(memosRes.data);

    setLoading(false);
  }

  useEffect(() => {
    fetchData(selectedFiscalYear);
  }, [selectedFiscalYear]);

  const monthlyAmount = setting?.monthly_amount ?? 3000;
  const carryoverAmount = setting?.carryover_amount ?? 0;

  const selectedMonthPayments = payments.filter(
    (payment) => payment.month === selectedMonth
  );

  const paidMemberIds = useMemo(() => {
    return new Set(selectedMonthPayments.map((payment) => payment.member_id));
  }, [selectedMonthPayments]);

  const paidMembers = members.filter((member) => paidMemberIds.has(member.id));
  const unpaidMembers = members.filter((member) => !paidMemberIds.has(member.id));

  const expectedAmount = members.length * monthlyAmount;
  const collectedAmount = paidMembers.length * monthlyAmount;
  const yearlyCollectedAmount = payments.reduce(
    (total, payment) => total + payment.amount,
    0
  );
  const yearlyExpectedAmount = members.length * monthlyAmount * 12;
  const yearlyExpenseAmount = expenses.reduce(
    (total, expense) => total + expense.amount,
    0
  );
  const currentBalance =
    yearlyCollectedAmount + carryoverAmount - yearlyExpenseAmount;

  function getMemberName(id: string) {
    return members.find((member) => member.id === id)?.name ?? "不明";
  }

  function changeMonth(month: number) {
    setSelectedMonth(month);
    setSelectedMemberIds([]);
  }

  function changeFiscalYear(year: number) {
    setSelectedFiscalYear(year);
    setSelectedMemberIds([]);
    setOpenSection(null);
  }

  function toggleSelected(memberId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  async function markAsPaid(memberId: string) {
    if (paidMemberIds.has(memberId)) return;

    setSaving(true);

    const { error } = await supabase.from("mujin_payments").insert({
      member_id: memberId,
      fiscal_year: selectedFiscalYear,
      month: selectedMonth,
      amount: monthlyAmount,
      paid_at: new Date().toISOString(),
    });

    if (error) {
      alert("保存に失敗しました");
      console.error(error);
    } else {
      await fetchData();
    }

    setSaving(false);
  }

  async function markSelectedAsPaid() {
    const targetIds = selectedMemberIds.filter((id) => !paidMemberIds.has(id));
    if (targetIds.length === 0) return;

    setSaving(true);

    const rows = targetIds.map((memberId) => ({
      member_id: memberId,
      fiscal_year: selectedFiscalYear,
      month: selectedMonth,
      amount: monthlyAmount,
      paid_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("mujin_payments").insert(rows);

    if (error) {
      alert("一括保存に失敗しました");
      console.error(error);
    } else {
      setSelectedMemberIds([]);
      await fetchData();
    }

    setSaving(false);
  }

  async function markAllAsPaid() {
    const targetIds = unpaidMembers.map((member) => member.id);
    if (targetIds.length === 0) return;

    const ok = confirm(`${selectedMonth}月の未払い全員を支払済みにしますか？`);
    if (!ok) return;

    setSaving(true);

    const rows = targetIds.map((memberId) => ({
      member_id: memberId,
      fiscal_year: selectedFiscalYear,
      month: selectedMonth,
      amount: monthlyAmount,
      paid_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("mujin_payments").insert(rows);

    if (error) {
      alert("全員分の保存に失敗しました");
      console.error(error);
    } else {
      setSelectedMemberIds([]);
      await fetchData();
    }

    setSaving(false);
  }

  async function backToUnpaid(memberId: string) {
    const payment = selectedMonthPayments.find(
      (item) => item.member_id === memberId
    );
    if (!payment) return;

    const ok = confirm(`${selectedMonth}月分を未収に戻しますか？`);
    if (!ok) return;

    setSaving(true);

    const { error } = await supabase
      .from("mujin_payments")
      .delete()
      .eq("id", payment.id);

    if (error) {
      alert("未収への変更に失敗しました");
      console.error(error);
    } else {
      await fetchData();
    }

    setSaving(false);
  }

  async function copyUnpaidMessage() {
    const text =
      unpaidMembers.length === 0
        ? `${selectedMonth}月分は全員集金済みです。`
        : `【${selectedFiscalYear}年度 ${selectedMonth}月 無尽 未払い】\n${unpaidMembers
            .map(
              (member) =>
                `・${member.name} ${monthlyAmount.toLocaleString()}円`
            )
            .join("\n")}`;

    await navigator.clipboard.writeText(text);
    alert("未払い一覧をコピーしました");
  }

  async function addExpense() {
    if (!expenseTitle.trim() || !expenseAmount) return;

    setSaving(true);

    const { error } = await supabase.from("mujin_expenses").insert({
      title: expenseTitle.trim(),
      amount: Number(expenseAmount),
      fiscal_year: selectedFiscalYear,
      month: selectedMonth,
      spent_at: new Date().toISOString(),
    });

    if (error) {
      alert("支出の保存に失敗しました");
      console.error(error);
    } else {
      setExpenseTitle("");
      setExpenseAmount("");
      await fetchData();
    }

    setSaving(false);
  }

  async function deleteExpense(id: string) {
    const ok = confirm("この支出を削除しますか？");
    if (!ok) return;

    setSaving(true);

    const { error } = await supabase.from("mujin_expenses").delete().eq("id", id);

    if (error) {
      alert("支出の削除に失敗しました");
      console.error(error);
    } else {
      await fetchData();
    }

    setSaving(false);
  }

  async function addAdvance() {
    if (!payerMemberId || !targetMemberId || !advanceAmount) return;

    setSaving(true);

    const { error } = await supabase.from("mujin_advances").insert({
      payer_member_id: payerMemberId,
      target_member_id: targetMemberId,
      amount: Number(advanceAmount),
      memo: advanceMemo.trim() || null,
      fiscal_year: selectedFiscalYear,
      month: selectedMonth,
      is_settled: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      alert("立て替えの保存に失敗しました");
      console.error(error);
    } else {
      setPayerMemberId("");
      setTargetMemberId("");
      setAdvanceAmount("");
      setAdvanceMemo("");
      await fetchData();
    }

    setSaving(false);
  }

  async function deleteAdvance(id: string) {
    const ok = confirm("この立て替え記録を削除しますか？");
    if (!ok) return;

    setSaving(true);

    const { error } = await supabase.from("mujin_advances").delete().eq("id", id);

    if (error) {
      alert("立て替え記録の削除に失敗しました");
      console.error(error);
    } else {
      await fetchData();
    }

    setSaving(false);
  }

  async function addUsageMemo() {
    if (!usageMemo.trim()) return;

    setSaving(true);

    const { error } = await supabase.from("mujin_usage_memos").insert({
      title: usageMemo.trim(),
      memo: usageMemo.trim(),
      fiscal_year: selectedFiscalYear,
      created_at: new Date().toISOString(),
    });

    if (error) {
      alert("メモの保存に失敗しました");
      console.error(error);
    } else {
      setUsageMemo("");
      await fetchData();
    }

    setSaving(false);
  }

  async function deleteUsageMemo(id: string) {
    const ok = confirm("このメモを削除しますか？");
    if (!ok) return;

    setSaving(true);

    const { error } = await supabase
      .from("mujin_usage_memos")
      .delete()
      .eq("id", id);

    if (error) {
      alert("メモの削除に失敗しました");
      console.error(error);
    } else {
      await fetchData();
    }

    setSaving(false);
  }

  async function updateYearSetting() {
    if (!editMonthlyAmount || !editCarryoverAmount) return;

    setSaving(true);

    const { error } = await supabase
      .from("mujin_fiscal_years")
      .update({
        monthly_amount: Number(editMonthlyAmount),
        carryover_amount: Number(editCarryoverAmount),
      })
      .eq("fiscal_year", selectedFiscalYear);

    if (error) {
      alert("年度設定の保存に失敗しました");
      console.error(error);
    } else {
      await fetchData();
    }

    setSaving(false);
  }

  function prepareNextYear() {
    const nextYear = selectedFiscalYear + 1;
    setNewFiscalYear(nextYear);
    setNewMonthlyAmount(String(monthlyAmount));
    setNewCarryoverAmount(String(currentBalance));
  }

  async function createFiscalYear() {
    if (!newFiscalYear || !newMonthlyAmount || !newCarryoverAmount) return;

    const exists = fiscalYears.some(
      (year) => year.fiscal_year === Number(newFiscalYear)
    );

    if (exists) {
      alert("その年度はすでに存在します");
      return;
    }

    const ok = confirm(
      `${newFiscalYear}年度を作成しますか？\n繰越金：${Number(
        newCarryoverAmount
      ).toLocaleString()}円`
    );
    if (!ok) return;

    setSaving(true);

    const { error } = await supabase.from("mujin_fiscal_years").insert({
      fiscal_year: Number(newFiscalYear),
      monthly_amount: Number(newMonthlyAmount),
      carryover_amount: Number(newCarryoverAmount),
    });

    if (error) {
      alert("新年度の作成に失敗しました");
      console.error(error);
    } else {
      setSelectedFiscalYear(Number(newFiscalYear));
      await fetchData(Number(newFiscalYear));
    }

    setSaving(false);
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold">御近所無尽</h1>

          <p className="mb-4 text-sm text-slate-500">
            パスワードを入力してください
          </p>

          <input
            type="password"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            className="Input"
            placeholder="パスワード"
          />

          <button onClick={handleLogin} className="PrimaryButton mt-4">
            ログイン
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <p className="text-slate-600">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 pb-28 text-slate-900">
      <div className="mx-auto max-w-md space-y-4">
        <header>
          <h1 className="text-2xl font-bold">御近所無尽</h1>
          <p className="text-sm text-slate-600">
            {selectedFiscalYear}年度 / {selectedMonth}月
          </p>
        </header>

        <section className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {fiscalYears.map((year) => (
              <button
                key={year.fiscal_year}
                onClick={() => changeFiscalYear(year.fiscal_year)}
                className={`min-w-24 rounded-full px-4 py-2 text-sm font-bold ${
                  selectedFiscalYear === year.fiscal_year
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {year.fiscal_year}年度
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {FISCAL_MONTHS.map((month) => (
              <button
                key={month}
                onClick={() => changeMonth(month)}
                className={`min-w-14 rounded-full px-4 py-2 text-sm font-bold ${
                  selectedMonth === month
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {month}月
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">今やること</p>
          <p className="mt-1 text-lg font-bold">
            {unpaidMembers.length === 0
              ? `${selectedMonth}月分は全員集金済み`
              : `${selectedMonth}月の未払い ${unpaidMembers.length}人を確認`}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Card label="選択月 集金済み" value={collectedAmount} />
          <Card label="選択月 予定" value={expectedAmount} />
          <Card label="年度集金済み" value={yearlyCollectedAmount} />
          <Card label="現在残高" value={currentBalance} />
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">未払い一覧</h2>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() =>
                  setSelectedMemberIds(unpaidMembers.map((member) => member.id))
                }
                className="font-bold text-slate-700"
              >
                全選択
              </button>
              <button
                onClick={() => setSelectedMemberIds([])}
                className="text-slate-500"
              >
                解除
              </button>
            </div>
          </div>

          {unpaidMembers.length === 0 ? (
            <p className="text-sm text-slate-500">未払いはありません。</p>
          ) : (
            <div className="space-y-2">
              {unpaidMembers.map((member) => {
                const selected = selectedMemberIds.includes(member.id);

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      selected
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelected(member.id)}
                      className="h-5 w-5"
                    />
                    <button
                      onClick={() => toggleSelected(member.id)}
                      className="flex-1 text-left font-medium"
                    >
                      {member.name}
                    </button>
                    <button
                      onClick={() => markAsPaid(member.id)}
                      disabled={saving}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      支払済
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={copyUnpaidMessage}
            className="mt-4 w-full rounded-xl bg-slate-100 py-3 text-sm font-bold"
          >
            LINE用未払い一覧をコピー
          </button>

          {unpaidMembers.length > 0 && (
            <button
              onClick={markAllAsPaid}
              disabled={saving}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold disabled:opacity-50"
            >
              {selectedMonth}月の未払い全員を支払済みにする
            </button>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">集金済み</h2>

          {paidMembers.length === 0 ? (
            <p className="text-sm text-slate-500">まだ集金済みはいません。</p>
          ) : (
            <div className="space-y-2">
              {paidMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl bg-slate-100 p-3"
                >
                  <span className="font-medium">{member.name}</span>
                  <button
                    onClick={() => backToUnpaid(member.id)}
                    disabled={saving}
                    className="rounded-full border bg-white px-4 py-2 text-sm font-bold disabled:opacity-50"
                  >
                    未収に戻す
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 text-sm shadow-sm">
          <h2 className="mb-2 text-lg font-bold">年度状況</h2>
          <p>月額：{monthlyAmount.toLocaleString()}円</p>
          <p>年度予定額：{yearlyExpectedAmount.toLocaleString()}円</p>
          <p>年度集金済み：{yearlyCollectedAmount.toLocaleString()}円</p>
          <p>支出合計：{yearlyExpenseAmount.toLocaleString()}円</p>
          <p>前年度繰越：{carryoverAmount.toLocaleString()}円</p>
          <p className="font-bold">
            現在残高：{currentBalance.toLocaleString()}円
          </p>
        </section>

        <Accordion
          title="年度設定"
          open={openSection === "year"}
          onClick={() => setOpenSection(openSection === "year" ? null : "year")}
        >
          <div className="rounded-xl bg-slate-100 p-3 text-sm">
            <p className="font-bold">{selectedFiscalYear}年度の設定</p>
            <p>現在残高：{currentBalance.toLocaleString()}円</p>
          </div>

          <input
            className="Input"
            type="number"
            placeholder="月額"
            value={editMonthlyAmount}
            onChange={(e) => setEditMonthlyAmount(e.target.value)}
          />

          <input
            className="Input"
            type="number"
            placeholder="前年度繰越金"
            value={editCarryoverAmount}
            onChange={(e) => setEditCarryoverAmount(e.target.value)}
          />

          <button
            className="PrimaryButton"
            onClick={updateYearSetting}
            disabled={saving}
          >
            年度設定を保存
          </button>

          <div className="border-t pt-3">
            <button
              className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold"
              onClick={prepareNextYear}
            >
              次年度作成の金額を自動入力
            </button>
          </div>

          <input
            className="Input"
            type="number"
            placeholder="新年度 例：2027"
            value={newFiscalYear}
            onChange={(e) => setNewFiscalYear(Number(e.target.value))}
          />

          <input
            className="Input"
            type="number"
            placeholder="新年度の月額"
            value={newMonthlyAmount}
            onChange={(e) => setNewMonthlyAmount(e.target.value)}
          />

          <input
            className="Input"
            type="number"
            placeholder="新年度の前年度繰越金"
            value={newCarryoverAmount}
            onChange={(e) => setNewCarryoverAmount(e.target.value)}
          />

          <button
            className="PrimaryButton"
            onClick={createFiscalYear}
            disabled={saving}
          >
            新年度を作成
          </button>
        </Accordion>

        <Accordion
          title="支出管理"
          open={openSection === "expense"}
          onClick={() =>
            setOpenSection(openSection === "expense" ? null : "expense")
          }
        >
          <input
            className="Input"
            placeholder="内容 例：BBQ買い出し"
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
          />
          <input
            className="Input"
            type="number"
            placeholder="金額"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
          />
          <button
            className="PrimaryButton"
            onClick={addExpense}
            disabled={saving}
          >
            支出を追加
          </button>

          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 text-sm"
            >
              <span>
                {expense.month}月：{expense.title}{" "}
                {expense.amount.toLocaleString()}円
              </span>
              <button
                onClick={() => deleteExpense(expense.id)}
                disabled={saving}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold disabled:opacity-50"
              >
                削除
              </button>
            </div>
          ))}
        </Accordion>

        <Accordion
          title="立て替え管理"
          open={openSection === "advance"}
          onClick={() =>
            setOpenSection(openSection === "advance" ? null : "advance")
          }
        >
          <select
            className="Input"
            value={payerMemberId}
            onChange={(e) => setPayerMemberId(e.target.value)}
          >
            <option value="">立て替えた人</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>

          <select
            className="Input"
            value={targetMemberId}
            onChange={(e) => setTargetMemberId(e.target.value)}
          >
            <option value="">立て替えてもらった人</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>

          <input
            className="Input"
            type="number"
            placeholder="金額"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
          />

          <input
            className="Input"
            placeholder="メモ 任意"
            value={advanceMemo}
            onChange={(e) => setAdvanceMemo(e.target.value)}
          />

          <button
            className="PrimaryButton"
            onClick={addAdvance}
            disabled={saving}
          >
            立て替えを追加
          </button>

          {advances.map((advance) => (
            <div
              key={advance.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 text-sm"
            >
              <span>
                {getMemberName(advance.payer_member_id)} →{" "}
                {getMemberName(advance.target_member_id)}{" "}
                {advance.amount.toLocaleString()}円
                {advance.memo ? `（${advance.memo}）` : ""}
              </span>
              <button
                onClick={() => deleteAdvance(advance.id)}
                disabled={saving}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold disabled:opacity-50"
              >
                削除
              </button>
            </div>
          ))}
        </Accordion>

        <Accordion
          title="利用案メモ"
          open={openSection === "memo"}
          onClick={() => setOpenSection(openSection === "memo" ? null : "memo")}
        >
          <input
            className="Input"
            placeholder="例：夏にBBQ"
            value={usageMemo}
            onChange={(e) => setUsageMemo(e.target.value)}
          />

          <button
            className="PrimaryButton"
            onClick={addUsageMemo}
            disabled={saving}
          >
            メモを追加
          </button>

          {usageMemos.map((memo) => (
            <div
              key={memo.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 text-sm"
            >
              <span>・{memo.memo}</span>
              <button
                onClick={() => deleteUsageMemo(memo.id)}
                disabled={saving}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold disabled:opacity-50"
              >
                削除
              </button>
            </div>
          ))}
        </Accordion>
      </div>

      {selectedMemberIds.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 px-4">
          <div className="mx-auto max-w-md rounded-2xl bg-slate-900 p-3 shadow-lg">
            <button
              onClick={markSelectedAsPaid}
              disabled={saving}
              className="w-full rounded-xl bg-white py-3 text-sm font-bold text-slate-900 disabled:opacity-50"
            >
              選択した{selectedMemberIds.length}人を支払済みにする
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}円</p>
    </div>
  );
}

function Accordion({
  title,
  open,
  onClick,
  children,
}: {
  title: string;
  open: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between font-bold"
      >
        <span>{title}</span>
        <span>{open ? "閉じる" : "開く"}</span>
      </button>

      {open && <div className="mt-4 space-y-3">{children}</div>}
    </section>
  );
}