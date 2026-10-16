import GameRound from './GameRound';

export default async function QuickLabPlay({ params }) {
  const { mode } = await params;
  return <GameRound mode={mode} />;
}
