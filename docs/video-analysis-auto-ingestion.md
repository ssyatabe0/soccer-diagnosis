# 谷田部指導パターン分析 → 症例DB 自動取込

## 対象

- 入力: `/Users/yatabeshinnosuke/Documents/フル動画解析/case_records/*.json`
- 取込先: `data/generated/video-analysis-imports.json`
- 公開API: `POST /api/ai-secretary/cases/import-video-analysis`

## 安全な公開フロー

1. 新規・更新JSONを `npm run sync:video-cases` で差分同期する。
2. `source_id` から固定の `case_code` を生成し、同じ動画・症例の再取込を重複させない。
3. 取込直後は必ず `permission_needed` とする。
4. 公開許可と匿名化確認が揃った症例だけ `published` に変更する。
5. `published` になった症例だけが一覧・自然文検索・カテゴリー・関連症例・JSON API・RSS・XML sitemap・video sitemap・`llms.txt` に出る。

ローカル素材パス、氏名、学校名、チーム名は生成ファイルへ保存しない。改善秒数は `video_verified` の記録だけを採用する。

## 自動実行

既存の Codex automation「Daily Soccer Case Import」を更新し、フル動画解析の新規・更新ファイルを症例DBにも同期する。データ差分がない場合は生成ファイルを書き換えないため、不要な再デプロイを発生させない。

## API取込

外部処理から直接送る場合は、Vercelに設定済みの `AI_SECRETARY_READ_TOKEN` をBearer tokenとして使う。

```http
POST /api/ai-secretary/cases/import-video-analysis
Authorization: Bearer <token>
Content-Type: application/json
```

最低限 `source_id` と `problem` または `result` が必要。`source_project + source_id` は冪等キーとして扱われる。
