#!/bin/bash
# cron設定スクリプト

# 現在のディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/venv/bin/python3"

# 仮想環境が存在するか確認
if [ ! -f "$VENV_PYTHON" ]; then
    echo "エラー: 仮想環境が見つかりません。"
    echo "まず 'python3 -m venv venv' を実行して仮想環境を作成してください。"
    exit 1
fi

# cronエントリを作成（仮想環境のPythonを使用）
CRON_ENTRY="0 18 * * * $VENV_PYTHON $SCRIPT_DIR/main.py >> $SCRIPT_DIR/cron.log 2>&1"

# 既存のcronエントリをチェック
if crontab -l 2>/dev/null | grep -q "$SCRIPT_DIR/main.py"; then
    echo "既にcronエントリが存在します。"
    read -p "上書きしますか？ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "キャンセルしました。"
        exit 1
    fi
    # 既存のエントリを削除
    crontab -l 2>/dev/null | grep -v "$SCRIPT_DIR/main.py" | crontab -
fi

# 新しいcronエントリを追加
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "cron設定が完了しました。"
echo "設定内容: $CRON_ENTRY"
echo ""
echo "現在のcron設定を確認:"
crontab -l | grep "$SCRIPT_DIR/main.py"

