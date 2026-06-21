import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}
export interface Poll {
  id: string;
  question: string;
  target_audience?: string;
  is_active?: boolean;
  options: PollOption[];
  total_votes: number;
  my_option_id?: string | null;
}

export async function getPolls(): Promise<Poll[]> {
  if (DEV_FAKE_ROLE) return mock.polls;
  const res = await api.get("/communication/polls");
  return (res.data?.data ?? []) as Poll[];
}

export async function votePoll(pollId: string, optionId: string): Promise<void> {
  if (DEV_FAKE_ROLE) return; // preview updates optimistically in the screen
  await api.post(`/communication/polls/${pollId}/vote`, { option_id: optionId });
}
