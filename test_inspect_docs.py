import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

url = 'https://cxuvnzwzacdinifulnjc.supabase.co/rest/v1'
headers = {
    'apikey': 'sb_publishable_FRCfum7b8elSUHHpGh2I_w_v_QK_n13',
    'Authorization': 'Bearer sb_publishable_FRCfum7b8elSUHHpGh2I_w_v_QK_n13',
}

docs_to_check = [
    'dd943b18-4a4d-4d7f-a8c5-99dc5528cf82', # image with 1 page
    'd458eed3-320c-4d08-ae78-98be8d85b63c', # pdf with 19 pages
    'f120e1ec-511c-47fe-9288-10b9d3db88fc', # pdf with 15 pages
    'b726614d-a66a-4da6-87ec-165788c8a84e', # pdf with 0 pages
]

for doc_id in docs_to_check:
    req = urllib.request.Request(f'{url}/documents?id=eq.{doc_id}', headers=headers)
    with urllib.request.urlopen(req) as resp:
        d = json.loads(resp.read().decode())[0]
    print(f"\n==============================")
    print(f"DOCUMENT: {d['id']} | {d['filename']} | file_type={d['file_type']} | total_pages={d['total_pages']} | status={d['status']}")
    
    req_p = urllib.request.Request(f'{url}/document_pages?document_id=eq.{doc_id}&order=page_number.asc', headers=headers)
    with urllib.request.urlopen(req_p) as resp_p:
        pages = json.loads(resp_p.read().decode())
    print(f"PAGES IN DB: {len(pages)}")
    for p in pages[:3]:
        print(f"  Page {p['page_number']}: status={p['status']}, needs_review={p['needs_review']}, conf={p['confidence_score']}")
        print(f"    raw_tamil_text[:60]: {repr((p['raw_tamil_text'] or '')[:60])}")
        print(f"    cleaned_tamil_text[:60]: {repr((p['cleaned_tamil_text'] or '')[:60])}")
        print(f"    english_translation[:60]: {repr((p['english_translation'] or '')[:60])}")
