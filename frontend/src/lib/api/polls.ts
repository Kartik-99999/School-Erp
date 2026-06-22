import api from "../axios";

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

export const getPolls = async (): Promise<Poll[]> =>
  (await api.get<{ success: boolean; data: Poll[] }>("/communication/polls")).data.data;

export const votePoll = async (pollId: string, optionId: string) =>
  (await api.post(`/communication/polls/${pollId}/vote`, { option_id: optionId })).data;
