import { NextResponse } from 'next/server';
import { getTrainingDataset } from '../../../../../services/aiTrainingDatasetService.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/ai/training-dataset — Phase 29.2's structured training examples, assembled from real, validated content only. */
export async function GET() {
  try {
    const dataset = await getTrainingDataset();
    return NextResponse.json(dataset);
  } catch (err) {
    return NextResponse.json({ code: 'TRAINING_DATASET_FAILED', message: err.message }, { status: 500 });
  }
}
