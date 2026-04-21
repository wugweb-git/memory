import { postgres } from "../db/postgres";

/**
 * L4 Evolution Engine
 * -------------------
 * The feedback loop that updates behavioral models based on user interaction.
 */
export class EvolutionEngine {
  
  /**
   * Processes a feedback event to update persona dimensions.
   */
  static async evolve(params: {
    userId: string;
    decisionId: string;
    feedbackType: 'accepted' | 'rejected' | 'ignored';
  }) {
    const { userId, decisionId, feedbackType } = params;

    // 1. Fetch the original decision to understand what was approved/denied
    const decision = await postgres.decisionLog.findUnique({
      where: { id: decisionId }
    });

    if (!decision) return;

    // 2. Behavioral Update Logic
    if (feedbackType === 'accepted') {
      await this.reinforceBehavior(userId, decision);
    } else if (feedbackType === 'rejected') {
      await this.correctBehavior(userId, decision);
    }

    // 3. Increment Occurrences for Confidence calculation
    await this.updateTraitConfidence(userId, decision, feedbackType);
  }

  private static async reinforceBehavior(userId: string, decision: any) {
    const mode = decision.mode;
    
    // Example: If an 'operator' decision was accepted, reinforce 'momentum' trait
    await postgres.traitScore.upsert({
      where: { userId_trait: { userId, trait: mode === 'operator' ? 'momentum' : 'system_thinking' } },
      update: { 
        score: { increment: 0.05 },
        occurrences: { increment: 1 }
      },
      create: {
        userId,
        trait: mode === 'operator' ? 'momentum' : 'system_thinking',
        score: 0.6,
        occurrences: 1
      }
    });

    // Update behavior models based on the decision mode
    await postgres.behaviorModel.upsert({
      where: { userId_modelType_key: { userId, modelType: 'decision_model', key: `mode_${mode}` } },
      update: { occurrences: { increment: 1 }, confidence: { increment: 0.01 } },
      create: { userId, modelType: 'decision_model', key: `mode_${mode}`, value: { preferred: true }, occurrences: 1, confidence: 0.55 }
    });
  }

  private static async correctBehavior(userId: string, decision: any) {
    const mode = decision.mode;

    // Penalize trait scores for rejected decisions
    await postgres.traitScore.updateMany({
      where: { userId, trait: mode === 'operator' ? 'momentum' : 'system_thinking' },
      data: { score: { decrement: 0.1 } }
    });
  }

  private static async updateTraitConfidence(userId: string, decision: any, type: string) {
    // Basic logic to increase system confidence in the model as more data arrives
    await postgres.personaProfile.upsert({
      where: { userId },
      update: { updatedAt: new Date() },
      create: { 
        userId, 
        bioSummary: "Identity model initialized via first feedback loop.",
        publicTraits: [],
        positioningKeywords: []
      }
    });
  }
}
