import urllib.request
url = 'https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsrounded/home/default/24px.svg'
try:
    response = urllib.request.urlopen(url)
    data = response.read().decode('utf-8')
    print("SUCCESS: " + data[:100])
except Exception as e:
    print("FAILED:", e)
