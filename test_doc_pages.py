import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

url = 'https://cxuvnzwzacdinifulnjc.supabase.co/rest/v1'
headers = {
    'apikey': 'sb_publishable_FRCfum7b8elSUHHpGh2I_w_v_QK_n13',
    'Authorization': 'Bearer sb_publishable_FRCfum7b8elSUHHpGh2I_w_v_QK_n13',
}

req = urllib.request.Request(f'{url}/documents?select=*&order=created_at.desc&limit=20', headers=headers)
with urllib.request.urlopen(req) as resp:
    docs = json.loads(resp.read().decode())

for d in docs:
    doc_id = d['id']
    req_p = urllib.request.Request(f'{url}/document_pages?select=page_number,status,raw_tamil_text,cleaned_tamil_text&document_id=eq.{doc_id}&order=page_number.asc', headers=headers)
    with urllib.request.urlopen(req_p) as resp_p:
        pages = json.loads(resp_p.read().decode())
    
    non_empty = [p for p in pages if (p.get('cleaned_tamil_text') or p.get('raw_tamil_text') or '').strip()]
    p_nums = [p['page_number'] for p in pages]
    print(f"Doc {doc_id} | {d['filename']} | total_pages={d['total_pages']} | DB pages={len(pages)} (has text: {len(non_empty)}) | page_nums={p_nums[:10]}...")
