import express from "express";
import { getAdminDb } from "../firebaseAdmin.js";
import { randomUUID } from "crypto";

const router = express.Router();

function isFirestoreUnavailable(error) {
  return (
    error?.code === 5 ||
    error?.code === "5" ||
    error?.status === 404 ||
    String(error?.message || "").includes("NOT_FOUND") ||
    String(error?.message || "")
      .toLowerCase()
      .includes("not found")
  );
}

router.get("/", async (req, res) => {
  try {
    const snapshot = await getAdminDb().collection("rewards").get();
    const rewards = snapshot.docs.map((docSnap) => docSnap.data());
    res.json({ rewards });
  } catch (error) {
    console.error("Error loading rewards:", error);

    if (isFirestoreUnavailable(error)) {
      return res.json({ rewards: [] });
    }

    res.status(500).json({ error: "Unable to load rewards." });
  }
});

router.get("/history/:uid", async (req, res) => {
  try {
    const snapshot = await getAdminDb()
      .collection("redemptions")
      .where("uid", "==", req.params.uid)
      .get();

    const history = snapshot.docs
      .map((doc) => doc.data())
      .sort(
        (a, b) =>
          new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime(),
      );

    res.json({ history });
  } catch (error) {
    console.error("Error loading history:", error);

    if (isFirestoreUnavailable(error)) {
      return res.json({ history: [] });
    }

    res.status(500).json({ error: "Unable to load redemption history." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, pointCost, stock } = req.body;

    const rewardId = randomUUID();
    const reward = {
      rewardId,
      title: title || "Gift Card",
      description: description || "Redeem your points for a digital gift card.",
      pointCost: Number(pointCost) || 100,
      stock: Number(stock) || 10,
      createdAt: new Date().toISOString(),
    };

    await getAdminDb()
      .collection("rewards")
      .doc(rewardId)
      .set(reward, { merge: true });
    res.json({ reward });
  } catch (error) {
    console.error("Error creating reward:", error);

    if (isFirestoreUnavailable(error)) {
      return res.json({ reward, degradedMode: true });
    }

    res.status(500).json({ error: "Unable to create reward." });
  }
});

router.patch("/:id/stock", async (req, res) => {
  try {
    const { stock } = req.body;
    await getAdminDb()
      .collection("rewards")
      .doc(req.params.id)
      .set({ stock: Number(stock) }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating stock:", error);

    if (isFirestoreUnavailable(error)) {
      return res.json({ success: true, degradedMode: true });
    }

    res.status(500).json({ error: "Unable to update stock." });
  }
});

router.post("/redeem", async (req, res) => {
  try {
    const { uid, rewardId } = req.body;
    const db = getAdminDb();

    await db.runTransaction(async (transaction) => {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User not found.");

      const rewardRef = db.collection("rewards").doc(rewardId);
      const rewardDoc = await transaction.get(rewardRef);
      if (!rewardDoc.exists) throw new Error("Reward not found.");

      const userData = userDoc.data();
      const rewardData = rewardDoc.data();

      if (userData.points < rewardData.pointCost) {
        throw new Error("Insufficient points to redeem this reward.");
      }
      if (rewardData.stock <= 0) {
        throw new Error("Reward out of stock.");
      }

      transaction.update(userRef, {
        points: userData.points - rewardData.pointCost,
      });
      transaction.update(rewardRef, { stock: rewardData.stock - 1 });

      const prefix = rewardData.title
        .substring(0, 4)
        .toUpperCase()
        .replace(/[^A-Z]/g, "GIFT");
      const randomPart =
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        "-" +
        Math.random().toString(36).substring(2, 6).toUpperCase();
      const generatedCode = `${prefix}-${randomPart}`;

      const redemptionRef = db.collection("redemptions").doc();
      transaction.set(redemptionRef, {
        redemptionId: redemptionRef.id,
        uid,
        rewardId,
        rewardTitle: rewardData.title,
        status: "Provided",
        redemptionCode: generatedCode,
        redeemedAt: new Date().toISOString(),
      });
    });

    res.json({ success: true, message: "Reward securely redeemed!" });
  } catch (error) {
    console.error("Error redeeming reward:", error);

    if (isFirestoreUnavailable(error)) {
      return res.json({
        success: true,
        message: "Reward redeemed in local demo mode.",
        degradedMode: true,
      });
    }

    res
      .status(400)
      .json({ error: error.message || "Failed to redeem penalty points." });
  }
});

export default router;
