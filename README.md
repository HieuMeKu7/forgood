# FRIEND/BETRAYAL IS FUN

> ⚠ **18+** — Game chứa ngôn ngữ thô tục, bạo lực cách điệu và mô tả các mối quan hệ độc hại
> (bắt nạt, thao túng, phản bội). Không chứa nội dung tình dục. Có tùy chọn giảm bạo lực hình ảnh
> trong Settings (tên lá bài giữ nguyên).

Web game thẻ bài single-player: ghép tổ đội 2 nhân vật, xây deck 30 lá, đấu với AI —
xoay quanh thanh **Quan hệ** chạy từ Friendship (+5) đến Betrayal (-5).

- **10 nhân vật**, mỗi người 21 lá bài (210 lá), nội tại và Ultimate riêng.
- **Engine data-driven** tách hoàn toàn khỏi UI, seeded RNG — mọi trận có thể tái hiện bằng seed.
- **AI 3 mức** (Easy / Normal / Hard — Hard mô phỏng trước 2 bước trên state clone).
- Lưu deck, cài đặt, lịch sử trận bằng `localStorage`. Không cần backend, không cần đăng nhập.

## Chạy dự án

Yêu cầu: Node.js 18+ (khuyến nghị 20/22).

```bash
npm install        # cài dependency
npm run dev        # chạy dev server (Vite) — mở http://localhost:5173
```

Các lệnh khác:

```bash
npm run typecheck  # kiểm tra TypeScript
npm test           # chạy unit tests (vitest) — 25 test luật + smoke tests
npm run build      # production build (tsc + vite) → dist/
npm run preview    # xem thử bản build
```

## Cách chơi nhanh

1. **New Game** → chọn deck (8 deck mẫu hoặc deck tự xây) → màn **Chọn Đối Thủ**: 10 kẻ địch
   data-driven, mỗi kẻ có deck 30 lá riêng, 4 profile độ khó (Dễ / Thường / Khó / **Boss**)
   với modifier riêng (thêm HP, Giáp mở màn, +1 Mana/lượt, Chảy máu chào sân…).
2. Mỗi lượt: Mana đặt lại thành 7 (tối đa 10), rút 5 lá, dùng tối đa 14 lá, bấm **End Turn**.
3. Hai đội dùng chung 50 HP; nhân vật vẫn là mục tiêu riêng cho Taunt/nội tại/Ultimate.
4. Mana thực trả cho lá của nhân vật nào sẽ nạp thanh **Ultimate** của nhân vật đó.
5. Đưa HP đội địch về 0 để thắng. Từ lượt 25 có **Kiệt Sức** (mất máu tăng dần) để trận luôn kết thúc.

Chi tiết luật, từ khóa và cơ chế riêng của từng nhân vật (Bản Sao, Nhiễu, Nhịp Chém, Phiếu,
Hai Mặt, Bia Thịt, Làm Nhục, Trò…) nằm trong màn **How to Play** trong game.

## Cấu trúc mã nguồn

```
src/
  engine/           # gameplay engine — KHÔNG phụ thuộc UI
    types.ts        # toàn bộ model (Card, Character, GameState, EffectDef DSL...)
    battle.ts       # turn flow, pipeline sát thương/Giáp/hồi, Taunt, statuses, passives
    resolvers.ts    # custom resolver cho các lá/Ultimate quá đặc biệt
    ai.ts           # AI 3 mức (hard = lookahead trên structuredClone)
    deck.ts         # validate deck, sinh deck ngẫu nhiên, mana curve
    enemyDeckBuilder.ts # resolve enemy + profile → deck/AI level/modifiers, validate hệ thống địch
    rng.ts          # mulberry32 seeded RNG (state nằm trong GameState)
  data/
    characters/     # 10 file data — 21 lá/nhân vật, thuần data (EffectDef)
    characterMeta.ts# nội tại + Ultimate của 10 nhân vật
    sampleDecks.ts  # 8 deck mẫu (mỗi deck đúng 30 lá, hợp lệ)
    enemies.ts      # 10 EnemyDefinition + modifiers + profiles (Easy/Normal/Hard/Boss)
    enemyDecks.ts   # 10 deck địch riêng (30 lá/deck, hợp lệ)
  types/
    enemy.ts        # model Enemy System (EnemyDefinition, EnemyProfile, EnemyModifier, EnemyIntentView)
  ui/               # React UI (screens, CardView, avatar SVG tự vẽ)
  store/            # localStorage + app context
  audio/            # Web Audio synth (không dùng file âm thanh ngoài)
tests/              # vitest — 25 test luật bắt buộc + smoke/self-play tests
```

## Ghi chú thiết kế

- **Effect DSL**: phần lớn 210 lá được mô tả bằng data (`EffectDef[]`) và được engine
  thông dịch; ~40 lá quá đặc biệt dùng `op: 'custom'` với resolver đăng ký theo id.
- **Seed**: hiển thị ở màn kết quả; **Rematch cùng seed** tái hiện đúng trận
  (cùng thứ tự xáo bài, cùng các cú roll Taunt/random).
- **Chảy máu** xuyên Giáp và kích hoạt cuối lượt của mục tiêu.
- **Phiếu (Duy)** tự động bù phần Mana còn thiếu khi chơi bài; Ultimate của Duy chỉ nạp
  theo Mana **thực trả**.
- Avatar là SVG hình khối tự vẽ — không dùng tài sản có bản quyền, không hình ảnh người thật.
- **Enemy System**: tay bài địch bị ẩn (chỉ thấy số lượng); **ý đồ (intent)** của địch được
  telegraph trong lượt của bạn — dự đoán thuần túy từ deck của chính địch theo seed
  (AI không bao giờ nhìn trộm draw pile của người chơi). Boss chạy AI Hard cộng toàn bộ
  boss modifier riêng của từng kẻ địch.
