# Pegas blog: Articles 5 and 6

Extract this archive directly over `C:\Pegas` and replace files when prompted.

Adds:
- Article 5: `The Day Pegas Stopped Needing a GPU Babysitter`
  - route: `/blog/pegas-serverless-gpu-modal-scale-to-zero`
- Article 6 (latest): `From One Model Call to a Multi-Agent System: How Pegas Learned to Route Work`
  - route: `/blog/pegas-multi-agent-request-desk`

Updates `/blog` with both cards. Article 6 is marked `Latest` and remains the newest article in the sequence.

The serverless-GPU source references nine proof screenshots, but those image files were not present in the supplied article upload/current project source. The deployment code intentionally omits the missing image embeds and their captions instead of publishing broken images. The article text and measurements remain intact.

No Modal/backend deployment is required for this blog-only patch.

After extraction:

```text
npm run build
```

If successful:

```text
git add .
git commit -m "Publish Pegas serverless GPU and multi-agent articles"
git push
```
