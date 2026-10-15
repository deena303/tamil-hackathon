import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

url = 'https://cxuvnzwzacdinifulnjc.supabase.co/rest/v1'
headers = {
    'apikey': 'sb_publishable_FRCfum7b8elSUHHpGh2I_w_v_QK_n13',
    'Authorization': 'Bearer sb_publishable_FRCfum7b8elSUHHpGh2I_w_v_QK_n13',
}

try:
    req = urllib.request.Request(f'{url}/documents?select=*&order=created_at.desc&limit=10', headers=headers)
    with urllib.request.urlopen(req) as resp:
        docs = json.loads(resp.read().decode())
    print(f'Total docs returned: {len(docs)}')
    for d in docs:
        print(f"Doc: id={d.get('id')} name={d.get('filename')} pages={d.get('total_pages')} status={d.get('status')}")

    req2 = urllib.request.Request(f'{url}/document_pages?select=*&limit=50', headers=headers)
    with urllib.request.urlopen(req2) as resp:
        pages = json.loads(resp.read().decode())
    print(f'\nTotal document_pages returned: {len(pages)}')
    for p in pages:
        raw_preview = (p.get('raw_tamil_text') or '')[:30].replace('\n', ' ')
        clean_preview = (p.get('cleaned_tamil_text') or '')[:30].replace('\n', ' ')
        print(f"Page: doc={p.get('document_id')} p#{p.get('page_number')} status={p.get('status')} raw_len={len(p.get('raw_tamil_text') or '')} clean_len={len(p.get('cleaned_tamil_text') or '')}")
except urllib.error.HTTPError as e:
    print('HTTPError:', e.code, e.read().decode('utf-8'))
except Exception as e:
    print('Error:', e)
