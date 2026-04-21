import { updateTrait } from "./traits";
import { upsertPreference } from "./preferences";
import { upsertBehavior } from "./behavior";
import { postgres } from "../db/postgres";

async function verify() {
  const userId = "verification_user";
  const sourceId = "test_signal_001";

  console.log("--- Layer 4 Verification ---");

  // 1. Test Traits (Weighted)
  console.log("\n1. Testing Traits...");
  await postgres.traitScore.deleteMany({ where: { userId } });
  
  await updateTrait({
    userId,
    trait: "analytical",
    newScore: 0.8,
    newConfidence: 0.5,
    sourceId
  });
  
  let trait = await postgres.traitScore.findUnique({ where: { userId_trait: { userId, trait: "analytical" } } });
  console.log("Initial Trait:", trait?.score, "Conf:", trait?.confidence);

  await updateTrait({
    userId,
    trait: "analytical",
    newScore: 0.2, // Low score signal
    newConfidence: 0.2, // Low confidence
    sourceId: "test_signal_002"
  });

  trait = await postgres.traitScore.findUnique({ where: { userId_trait: { userId, trait: "analytical" } } });
  console.log("After Low Conf Signal (Score should remain close to 0.8):", trait?.score, "Conf:", trait?.confidence);

  // 2. Test Preferences (Explicit Override)
  console.log("\n2. Testing Preferences...");
  await postgres.preference.deleteMany({ where: { userId } });

  await upsertPreference({
    userId,
    category: "communication",
    key: "tone",
    value: "formal",
    explicit: false,
    confidence: 0.7,
    sourceId
  });

  let pref = await postgres.preference.findUnique({ where: { userId_category_key: { userId, category: "communication", key: "tone" } } });
  console.log("Initial Pref (Implicit):", pref?.value, "Explicit:", pref?.explicit);

  await upsertPreference({
    userId,
    category: "communication",
    key: "tone",
    value: "direct",
    explicit: true, // User manual override
    confidence: 1.0,
    sourceId: "user_setting"
  });

  pref = await postgres.preference.findUnique({ where: { userId_category_key: { userId, category: "communication", key: "tone" } } });
  console.log("After Explicit Override:", pref?.value, "Explicit:", pref?.explicit);

  // 3. Test Behavior (Confidence Growth)
  console.log("\n3. Testing Behavior...");
  await postgres.behaviorModel.deleteMany({ where: { userId } });

  await upsertBehavior({
    userId,
    modelType: "habit_model",
    key: "early_riser",
    newValue: 0.9,
    newConfidence: 0.5,
    sourceId
  });

  let behavior = await postgres.behaviorModel.findUnique({ where: { userId_modelType_key: { userId, modelType: "habit_model", key: "early_riser" } } });
  console.log("Initial Behavior Conf:", behavior?.confidence);

  await upsertBehavior({
    userId,
    modelType: "habit_model",
    key: "early_riser",
    newValue: 0.9,
    newConfidence: 0.5,
    sourceId: "test_signal_003"
  });

  behavior = await postgres.behaviorModel.findUnique({ where: { userId_modelType_key: { userId, modelType: "habit_model", key: "early_riser" } } });
  console.log("After Second Consistent Signal (Conf should increase):", behavior?.confidence);

  console.log("\nVerification Complete.");
  process.exit();
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
