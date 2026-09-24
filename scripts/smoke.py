"""HTTP smoke test against the actual Docker stack. Uses only Python's standard library."""
import base64, json, os, struct, uuid, zlib, urllib.request, urllib.error

base = os.environ.get('INOVA_URL', 'http://localhost:8088').rstrip('/')

def request(method, route, data=None, token=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(base + route, data=None if data is None else json.dumps(data).encode(), headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    payload = response.read()
    assert response.status == expected, (method, route, response.status, payload[:500])
    if 'application/json' in response.headers.get('Content-Type',''):
        return json.loads(payload)
    return payload

assert b'VilaVerde' in request('GET','/')
assert b"'/api'" in request('GET','/js/app.js')
request('GET','/api/health')
request('GET','/api/auth/me',expected=401)
email = 'smoke-' + uuid.uuid4().hex + '@example.com'
credentials = {'name':'Teste automatizado','email':email,'password':'test-password-123'}
owner = request('POST','/api/auth/register',credentials)['token']
request('POST','/api/auth/login',credentials)
request('PUT','/api/auth/location',{'bairro':'Centro','cidade':'Serra, ES'},owner)
def chunk(kind, data):
    return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data))
png = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\x00\x00\xff\x00'))+chunk(b'IEND',b'')
photo = 'data:image/png;base64,'+base64.b64encode(png).decode()
proposal = request('POST','/api/proposals',{'title':'Teste Docker','desc':'Validação automatizada','bairro':'Centro','tipo':'praca','photo':photo},owner,201)
route = '/api/proposals/' + str(proposal['id'])
try:
    details = request('GET',route,token=owner)
    assert details['ia']['treesRequired'] == 25 and details['votes'] == 1
    assert request('GET','/api'+details['photo']).startswith(b'\x89PNG')
    request('GET','/api/v1/users/me',token=owner)
    request('POST',route+'/vote',{'direction':'up'},owner)
    assert request('GET',route,token=owner)['votes'] == 0
    request('POST',route+'/vote',{'direction':'down'},owner)
    assert request('GET',route,token=owner)['votes'] == -1
    request('PUT',route,{'title':'Editada','desc':'Atualizada','bairro':'Centro'},owner)
    assert request('GET',route,token=owner)['title'] == 'Editada'
    request('GET','/api/proposals/ranking',token=owner)
finally:
    request('DELETE',route,token=owner,expected=204)
request('GET',route,token=owner,expected=404)
print('PASS: front-end, proxy, MySQL, autenticação, propostas, votos, ranking e exclusão')
print('Conta de teste criada: ' + email)
