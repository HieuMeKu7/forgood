import React from 'react';
import { AppProvider, useApp } from './store/appStore';
import { MainMenu } from './ui/screens/MainMenu';
import { DeckBuilder } from './ui/screens/DeckBuilder';
import { CharactersScreen } from './ui/screens/Characters';
import { CardLibrary } from './ui/screens/CardLibrary';
import { HistoryScreen } from './ui/screens/History';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { HowToPlay } from './ui/screens/HowToPlay';
import { BattleScreen } from './ui/screens/Battle';
import { ResultScreen } from './ui/screens/Result';
import { EnemySelect } from './ui/screens/EnemySelect';
import { isWarningAccepted, acceptWarning } from './store/storage';

function ContentWarning({ onAccept }: { onAccept: () => void }): JSX.Element {
  return (
    <div className="modal-backdrop">
      <div className="modal warning-modal">
        <h2>⚠ CẢNH BÁO NỘI DUNG — 18+</h2>
        <p>
          <strong>FRIEND/BETRAYAL IS FUN</strong> chứa ngôn ngữ thô tục, bạo lực cách điệu
          và mô tả các mối quan hệ độc hại (bắt nạt, thao túng, phản bội).
        </p>
        <p>Game không chứa nội dung tình dục và không nhắm vào bất kỳ nhóm người nào ngoài đời thực.</p>
        <p className="dim">Bạn có thể giảm hiệu ứng bạo lực hình ảnh trong Settings (tên lá bài giữ nguyên).</p>
        <button className="betrayal" onClick={onAccept}>Tôi đủ 18 tuổi — Vào game</button>
      </div>
    </div>
  );
}

function Router(): JSX.Element {
  const app = useApp();
  const [warningAccepted, setWarningAccepted] = React.useState(() => isWarningAccepted());

  const style = {
    ['--anim-speed' as string]: app.settings.fastAnimations ? 0.25 : 1,
  };

  return (
    <div className={app.settings.reducedViolence ? 'reduced-violence' : ''} style={style}>
      {!warningAccepted && <ContentWarning onAccept={() => { acceptWarning(); setWarningAccepted(true); }} />}
      {app.screen === 'menu' && <MainMenu />}
      {app.screen === 'deckBuilder' && <DeckBuilder />}
      {app.screen === 'characters' && <CharactersScreen />}
      {app.screen === 'library' && <CardLibrary />}
      {app.screen === 'history' && <HistoryScreen />}
      {app.screen === 'settings' && <SettingsScreen />}
      {app.screen === 'howto' && <HowToPlay />}
      {app.screen === 'enemySelect' && <EnemySelect />}
      {app.screen === 'battle' && <BattleScreen />}
      {app.screen === 'result' && <ResultScreen />}
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
