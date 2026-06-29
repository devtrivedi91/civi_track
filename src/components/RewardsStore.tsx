import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import {
  Gift,
  Zap,
  ShieldCheck,
  Edit3,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { apiUrl } from "../lib/api";
import { initialMockRewards } from "../lib/mockData";

interface Redemption {
  redemptionId: string;
  rewardTitle: string;
  status: string;
  redemptionCode: string;
  redeemedAt: string;
}

interface Reward {
  rewardId: string;
  title: string;
  description: string;
  pointCost: number;
  stock: number;
}

interface RewardsStoreProps {
  currentUser: UserProfile;
  onUpdatePoints: (newPoints: number) => void;
}

export default function RewardsStore({
  currentUser,
  onUpdatePoints,
}: RewardsStoreProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [history, setHistory] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"store" | "history">("store");
  const [alertBox, setAlertBox] = useState<{
    title: string;
    message: string;
    isConfirm: boolean;
    onConfirm?: () => void;
  } | null>(null);

  // Admin form state
  const [rewardType, setRewardType] = useState("amazon");
  const [cardAmount, setCardAmount] = useState("10");
  const [pointCost, setPointCost] = useState("100");
  const [stock, setStock] = useState("10");

  const GIFT_CARD_TYPES: Record<string, { title: string; gradient: string }> = {
    amazon: {
      title: "Amazon Gift Card",
      gradient: "from-amber-400 to-orange-500",
    },
    starbucks: {
      title: "Starbucks Gift Card",
      gradient: "from-emerald-500 to-teal-700",
    },
    target: {
      title: "Target Gift Card",
      gradient: "from-rose-500 to-red-600",
    },
    walmart: {
      title: "Walmart Gift Card",
      gradient: "from-blue-400 to-blue-700",
    },
    generic: {
      title: "Digital Reward",
      gradient: "from-slate-400 to-slate-600",
    },
  };

  const getGradient = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("amazon")) return GIFT_CARD_TYPES.amazon.gradient;
    if (lower.includes("starbucks")) return GIFT_CARD_TYPES.starbucks.gradient;
    if (lower.includes("target")) return GIFT_CARD_TYPES.target.gradient;
    if (lower.includes("walmart")) return GIFT_CARD_TYPES.walmart.gradient;
    return GIFT_CARD_TYPES.generic.gradient;
  };

  const loadRewards = async () => {
    try {
      setLoading(true);
      const [resRewards, resHistory] = await Promise.all([
        fetch(apiUrl("/api/rewards")),
        fetch(apiUrl(`/api/rewards/history/${currentUser.uid}`)),
      ]);
      const dataRewards = await resRewards.json();
      const dataHistory = await resHistory.json();

      const fetchedRewards = Array.isArray(dataRewards.rewards)
        ? dataRewards.rewards
        : [];

      if (dataRewards.degradedMode) {
        setRewards(initialMockRewards);
      } else if (fetchedRewards.length > 0) {
        setRewards(fetchedRewards);
      } else {
        setRewards(initialMockRewards);
      }

      if (dataHistory.history) setHistory(dataHistory.history);
    } catch (err) {
      console.error("Failed to fetch rewards details", err);
      setRewards(initialMockRewards);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewards();
  }, [currentUser.uid]);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    const config = GIFT_CARD_TYPES[rewardType];
    const generatedTitle = `$${cardAmount} ${config.title}`;
    const generatedDesc = `Redeem your hard-earned points for a $${cardAmount} digital ${config.title}.`;
    const optimisticReward = {
      rewardId: `reward-${Date.now()}`,
      title: generatedTitle,
      description: generatedDesc,
      pointCost: Number(pointCost),
      stock: Number(stock),
      createdAt: new Date().toISOString(),
    };

    setRewards((prev) => [optimisticReward, ...prev]);
    setAlertBox({
      title: "Publisher Live",
      message: "Reward tier published locally and syncing to Firebase.",
      isConfirm: false,
    });

    try {
      const res = await fetch(apiUrl("/api/rewards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generatedTitle,
          description: generatedDesc,
          pointCost,
          stock,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Unable to publish reward.");
      }

      loadRewards();
      setAlertBox({
        title: "Publisher Live",
        message: data.degradedMode
          ? "Reward published locally because Firebase is temporarily unavailable."
          : "Reward tier successfully created and published!",
        isConfirm: false,
      });
      setCardAmount("10");
      setPointCost("100");
      setStock("10");
    } catch (err) {
      console.error(err);
      setAlertBox({
        title: "Publish Failed",
        message:
          err instanceof Error ? err.message : "Could not publish reward.",
        isConfirm: false,
      });
      setRewards((prev) =>
        prev.filter((reward) => reward.rewardId !== optimisticReward.rewardId),
      );
    }
  };

  const updateStock = async (rewardId: string, newStock: number) => {
    try {
      const res = await fetch(apiUrl(`/api/rewards/${rewardId}/stock`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      });
      if (res.ok) {
        setAlertBox({
          title: "Inventory Updated",
          message: "Stock configuration applied to remote.",
          isConfirm: false,
        });
        loadRewards();
      } else {
        setAlertBox({
          title: "Stock Error",
          message: "Failed to allocate stock to the database.",
          isConfirm: false,
        });
      }
    } catch (err) {
      console.error("Stock update error:", err);
    }
  };

  const triggerRedemption = async (reward: Reward) => {
    try {
      setAlertBox(null);
      const res = await fetch(apiUrl("/api/rewards/redeem"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: currentUser.uid,
          rewardId: reward.rewardId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAlertBox({
        title: "Purchase Successful!",
        message:
          data.message +
          " You can view your redemption code in the active history portal.",
        isConfirm: false,
      });
      onUpdatePoints(currentUser.points - reward.pointCost);
      loadRewards();
    } catch (err: any) {
      setAlertBox({
        title: "Transaction Denied",
        message: err.message || "Redemption failed.",
        isConfirm: false,
      });
    }
  };

  const redeemReward = (reward: Reward) => {
    if (currentUser.points < reward.pointCost) {
      setAlertBox({
        title: "Insufficient Funds",
        message: "You don't have enough points to afford this digital asset.",
        isConfirm: false,
      });
      return;
    }
    setAlertBox({
      title: "Confirm Purchase",
      message: `Do you want to permanently exchange ${reward.pointCost} points for: ${reward.title}?`,
      isConfirm: true,
      onConfirm: () => triggerRedemption(reward),
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-gradient-to-br from-indigo-900 to-purple-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden flex justify-between items-center">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl mix-blend-overlay"></div>
        <div className="z-10 relative">
          <h2 className="text-4xl font-display font-bold mb-2 flex items-center gap-3">
            <Gift className="w-10 h-10 text-pink-300" /> Reward Store
          </h2>
          <p className="text-indigo-200">
            Redeem your hard-earned civic points for digital gift cards and
            exclusive badges.
          </p>
          <div className="mt-6 flex items-center gap-2 bg-white/10 p-1 rounded-xl w-max border border-white/20">
            <button
              onClick={() => setActiveTab("store")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition ${activeTab === "store" ? "bg-white text-indigo-900 shadow-md" : "text-white hover:bg-white/10"}`}
            >
              Live Storefront
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === "history" ? "bg-white text-indigo-900 shadow-md" : "text-white hover:bg-white/10"}`}
            >
              <Clock className="w-4 h-4" /> Activity Ledger
            </button>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-center z-10 shadow-xl">
          <p className="text-xs text-indigo-200 font-semibold mb-1 uppercase tracking-wider">
            Your Balance
          </p>
          <div className="flex items-center gap-2 justify-center text-4xl font-black text-white">
            <Zap className="text-yellow-400 w-8 h-8 fill-yellow-400" />
            {currentUser.points}
          </div>
        </div>
      </div>

      {currentUser.role === "Admin" && (
        <form
          onSubmit={handleCreateReward}
          className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 flex flex-col gap-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 bg-red-100 text-red-700 font-bold text-xs rounded-bl-xl">
            <ShieldCheck className="inline w-4 h-4 mr-1" />
            Admin Controls
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            Create New Reward Tier
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <select
              value={rewardType}
              onChange={(e) => setRewardType(e.target.value)}
              className="border rounded-xl px-4 py-3 bg-slate-50 text-sm focus:ring-2 ring-indigo-500"
            >
              <option value="amazon">Amazon Gift Card</option>
              <option value="starbucks">Starbucks Gift Card</option>
              <option value="target">Target Gift Card</option>
              <option value="walmart">Walmart Gift Card</option>
            </select>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                $
              </span>
              <input
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                required
                type="number"
                placeholder="Value (e.g. 10)"
                className="border rounded-xl pl-8 pr-4 py-3 w-full bg-slate-50 text-sm focus:ring-2 ring-indigo-500"
              />
            </div>
            <input
              value={pointCost}
              onChange={(e) => setPointCost(e.target.value)}
              required
              type="number"
              placeholder="Point Cost"
              className="border rounded-xl px-4 py-3 bg-slate-50 text-sm focus:ring-2 ring-indigo-500"
              title="Points Required"
            />
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
              type="number"
              placeholder="Stock Available"
              className="border rounded-xl px-4 py-3 bg-slate-50 text-sm focus:ring-2 ring-indigo-500"
              title="Inventory Stock"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-900 text-white rounded-xl py-3 font-semibold w-full hover:bg-slate-800 transition"
          >
            Publish {GIFT_CARD_TYPES[rewardType].title}
          </button>
        </form>
      )}

      {alertBox && (
        <div className="fixed bottom-6 right-6 z-[2100] max-w-sm bg-white border border-slate-200 shadow-2xl rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                {alertBox.title}
              </h4>
              <p className="text-xs text-slate-600 mt-1">{alertBox.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setAlertBox(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              aria-label="Dismiss alert"
            >
              ×
            </button>
          </div>
          {alertBox.isConfirm && (
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setAlertBox(null)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const confirmAction = alertBox.onConfirm;
                  setAlertBox(null);
                  confirmAction?.();
                }}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab Management System */}
      {activeTab === "store" ? (
        <>
          {/* Rewards Grid */}
          <h3 className="text-2xl font-bold font-display text-slate-800 pt-4">
            Available Rewards
          </h3>
          {loading ? (
            <div className="flex justify-center p-12 text-slate-400 font-medium">
              Loading store inventory...
            </div>
          ) : rewards.length === 0 ? (
            <div className="bg-white border rounded-2xl p-12 text-center text-slate-500 shadow-sm">
              No rewards have been configured yet. Admins can add new reward
              tiers above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => (
                <div
                  key={reward.rewardId}
                  className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group"
                >
                  <div
                    className={`h-32 bg-gradient-to-br ${getGradient(reward.title)} block relative overflow-hidden p-6`}
                  >
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-indigo-900 font-bold px-3 py-1 rounded-full text-xs shadow-md border border-slate-100 flex flex-center gap-1 group-hover:scale-105 transition-transform duration-300">
                      <Zap className="w-3 h-3 text-indigo-600" />{" "}
                      {reward.pointCost} pts
                    </div>
                    <div className="absolute -bottom-10 -right-6 text-white/20 transform rotate-12 group-hover:rotate-6 transition-all duration-500">
                      <Gift className="w-32 h-32" />
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="font-bold text-lg text-slate-800 mb-1">
                      {reward.title}
                    </h4>
                    <p className="text-sm text-slate-500 flex-1 mb-4 leading-relaxed">
                      {reward.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                        {reward.stock} Left in Stock
                      </span>
                      <button
                        onClick={() => redeemReward(reward)}
                        disabled={
                          reward.stock <= 0 ||
                          currentUser.points < reward.pointCost
                        }
                        className="bg-indigo-600 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-600 text-white font-semibold py-2 px-6 rounded-xl hover:bg-indigo-700 transition shadow-inner"
                      >
                        {reward.stock <= 0 ? "Out of Stock" : "Redeem"}
                      </button>
                    </div>

                    {/* Admin Stock Management Module */}
                    {currentUser.role === "Admin" && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <Edit3 className="w-3 h-3" />
                          Manage Stock:
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            defaultValue={reward.stock}
                            id={`stock-${reward.rewardId}`}
                            className="border rounded-lg w-16 px-2 py-1 text-xs bg-slate-50 text-center font-bold text-slate-700"
                          />
                          <button
                            onClick={() =>
                              updateStock(
                                reward.rewardId,
                                Number(
                                  (
                                    document.getElementById(
                                      `stock-${reward.rewardId}`,
                                    ) as HTMLInputElement
                                  ).value,
                                ),
                              )
                            }
                            className="bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold transition"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* History Ledger Tab */
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl mt-8">
          <h3 className="text-2xl font-bold font-display text-slate-800 mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" /> Secure Purchase Ledger
          </h3>
          {history.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50 border border-dashed rounded-2xl">
              You haven't explicitly redeemed any digital assets yet!
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record) => (
                <div
                  key={record.redemptionId}
                  className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-slate-100 bg-slate-50 rounded-2xl hover:bg-slate-100 transition shadow-sm"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">
                      {record.rewardTitle}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Procured on:{" "}
                      {new Date(record.redeemedAt).toLocaleDateString()} at{" "}
                      {new Date(record.redeemedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0 md:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {record.status} PIN:
                    </p>
                    <div className="bg-white border border-emerald-200 px-4 py-2 rounded-xl text-emerald-700 font-mono font-bold tracking-widest shadow-sm inline-flex items-center gap-2 selection:bg-emerald-100">
                      <CheckCircle className="w-4 h-4" />{" "}
                      {record.redemptionCode}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Styled Alert Modal Component */}
      {alertBox && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div
              className={`h-2 ${alertBox.isConfirm ? "bg-amber-400" : "bg-indigo-600"} w-full`}
            ></div>
            <div className="p-8">
              <h3 className="text-2xl font-black text-slate-800 mb-3">
                {alertBox.title}
              </h3>
              <p className="text-slate-500 leading-relaxed text-sm mb-8">
                {alertBox.message}
              </p>
              <div className="flex gap-3 justify-end">
                {alertBox.isConfirm ? (
                  <>
                    <button
                      onClick={() => setAlertBox(null)}
                      className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (alertBox.onConfirm) alertBox.onConfirm();
                      }}
                      className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
                    >
                      Confirm Action
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAlertBox(null)}
                    className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition w-full"
                  >
                    Acknowledged
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
