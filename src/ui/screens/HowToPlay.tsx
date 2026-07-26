import React from 'react';
import { useApp } from '../../store/appStore';
import { KEYWORD_GLOSSARY } from '../CardView';

function Rule({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="panel">
      <h2 style={{ fontSize: 17, marginBottom: 8, letterSpacing: 0.5 }}>{title}</h2>
      {children}
    </div>
  );
}

const ulStyle: React.CSSProperties = { paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 };

export function HowToPlay(): JSX.Element {
  const app = useApp();
  return (
    <div className="screen">
      <button className="back-btn" onClick={() => app.navigate('menu')}>← Menu</button>
      <h1 className="page-title">Cách chơi</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Rule title="1. Đội hình">
          <ul style={ulStyle}>
            <li>Mỗi đội có tối đa <strong>2 nhân vật</strong>, dùng chung <strong>50 HP</strong>.</li>
            <li>Từng nhân vật vẫn là mục tiêu riêng cho Taunt, nội tại và Ultimate.</li>
            <li>Đội thua khi HP về 0.</li>
          </ul>
        </Rule>

        <Rule title="2. Lượt chơi">
          <ul style={ulStyle}>
            <li>Người chơi đi trước.</li>
            <li>Đầu lượt: Mana đặt lại về <strong>7</strong> (tối đa 10), rút <strong>5</strong> lá.</li>
            <li>Mỗi lượt dùng tối đa <strong>14</strong> lá.</li>
            <li>Cuối lượt bỏ toàn bộ tay, trừ lá có <strong>Giữ lại</strong>.</li>
            <li>Hết draw pile thì xáo discard pile thành draw pile mới.</li>
            <li>Lá <strong>Tiêu hao</strong> rời khỏi trận sau khi dùng.</li>
            <li>Tổng Mana được hoàn lại tối đa <strong>5</strong> mỗi lượt.</li>
          </ul>
        </Rule>

        <Rule title="3. Giáp">
          <ul style={ulStyle}>
            <li>Giáp hấp thụ sát thương trước khi trừ HP.</li>
            <li>Giáp mất vào đầu lượt của chủ sở hữu, trừ khi có hiệu ứng giữ Giáp.</li>
          </ul>
        </Rule>

        <Rule title="4. Quan hệ">
          <ul style={ulStyle}>
            <li>Thang Quan hệ của mỗi đội chạy từ <strong>-5 đến +5</strong>, bắt đầu ở 0.</li>
            <li>Từ <span className="rel-state-friendship">+3 đến +5</span>: trạng thái <strong>Friendship</strong>.</li>
            <li>Từ <span className="rel-state-betrayal">-3 đến -5</span>: trạng thái <strong>Betrayal</strong>.</li>
          </ul>
        </Rule>

        <Rule title="5. Ultimate">
          <ul style={ulStyle}>
            <li>Mỗi nhân vật có thanh Ultimate riêng.</li>
            <li>Mana <strong>thực trả</strong> cho lá của nhân vật nào sẽ nạp Ultimate cho nhân vật đó.</li>
            <li>Lá 0 cost thường không nạp Ultimate.</li>
            <li><strong>Bản Sao</strong> có Mana Value 4 — nạp 4 điểm cho chủ của lá gốc.</li>
            <li>Ultimate tốn 0 Mana và chỉ dùng được <strong>1 lần mỗi trận</strong>.</li>
          </ul>
        </Rule>

        <Rule title="6. Từ khóa">
          <ul style={ulStyle}>
            {Object.entries(KEYWORD_GLOSSARY).map(([k, text]) => (
              <li key={k}>{text}</li>
            ))}
          </ul>
        </Rule>

        <Rule title="7. Bản Sao (Yến)">
          <ul style={ulStyle}>
            <li>Chỉ sao chép lá có <strong>cost gốc 0</strong> của đồng minh.</li>
            <li>Không sao chép Ultimate, Bản Sao khác, hay lá tạm thời.</li>
            <li>Bản Sao tốn 0 Mana và <strong>Tiêu hao</strong> sau khi dùng.</li>
            <li>Tối đa <strong>10</strong> Bản Sao trên tay.</li>
          </ul>
        </Rule>

        <Rule title="8. Chảy máu">
          <ul style={ulStyle}>
            <li>Chảy máu <strong>xuyên Giáp</strong>.</li>
            <li>Kích hoạt vào cuối lượt của mục tiêu, sau đó giảm 1 stack.</li>
          </ul>
        </Rule>

        <Rule title="9. Cơ chế riêng của nhân vật">
          <ul style={ulStyle}>
            <li><strong>Trò</strong> (Mộc): mỗi lá 0 Mana cho 1 điểm Trò; đủ 3 điểm thì xóa điểm, nhận 1 Mana và rút 1 lá.</li>
            <li><strong>Nhiễu / Quá Tải</strong> (Lâm): nhận đòn trong lượt đối thủ tích Nhiễu theo mốc sát thương; đầu lượt sau đổi Nhiễu thành Mana.</li>
            <li><strong>Bia Thịt</strong> (Trúc): ép đồng minh nhận Taunt tối thiểu 60%; mỗi đòn chuyển sang họ hồi HP cho đội (có giới hạn mỗi lượt).</li>
            <li><strong>Nhịp Chém</strong> (Khanh): mỗi lá Khanh dùng trong lượt tăng Nhịp; mốc 3/6/9 lá cộng thêm sát thương, đặt lại cuối lượt.</li>
            <li><strong>Phiếu</strong> (Duy): tự động bù phần Mana thiếu khi chơi bài, tối đa <strong>6</strong> Phiếu, giữ qua lượt.</li>
            <li><strong>Hai Mặt / Lật Mặt / Vỡ Mặt Nạ</strong> (Miên): lá Hai Mặt đổi hiệu ứng theo mặt Trắng/Đen; Lật Mặt đổi mặt; Lật Mặt 3 lần một lượt kích hoạt Vỡ Mặt Nạ (kích hoạt cả hai mặt: mặt hiện tại 100%, mặt kia 50%).</li>
            <li><strong>Làm Nhục</strong> (Trúc): mỗi stack khiến đối phương <strong>-1 Giáp nhận vào</strong> và <strong>-1 hồi phục</strong>, tối đa 5 stack, giảm 1 cuối lượt.</li>
          </ul>
        </Rule>

        <Rule title="10. Kiệt Sức">
          <ul style={ulStyle}>
            <li>Từ lượt <strong>25</strong>, đầu lượt mỗi đội mất <strong>(lượt - 24)</strong> HP, xuyên Giáp.</li>
            <li>Đảm bảo trận đấu luôn kết thúc.</li>
          </ul>
        </Rule>

        <Rule title="11. Taunt với nhiều nhân vật">
          <ul style={ulStyle}>
            <li>Nếu nhiều nhân vật có Taunt: ưu tiên nhân vật có % cao nhất; bằng nhau thì chọn ngẫu nhiên theo seed.</li>
            <li>Lá đánh nhiều hit chỉ kiểm tra Taunt <strong>1 lần</strong> cho cả lá.</li>
            <li>Đòn AoE không bị Taunt chuyển hướng.</li>
          </ul>
        </Rule>

        <Rule title="12. Seed">
          <ul style={ulStyle}>
            <li>Mỗi trận đấu có một seed riêng.</li>
            <li>Rematch với cùng seed sẽ tái hiện đúng trận đấu đó.</li>
          </ul>
        </Rule>
      </div>
    </div>
  );
}
