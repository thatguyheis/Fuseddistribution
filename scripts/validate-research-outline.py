#!/usr/bin/env python3
"""Cheap topic contract before section inference; this never approves content."""
import re
import sys

STOP = set('what when why how a an the to of for in with without and or your small business needs need changes using use'.split())
def validate(keyword, headings):
    headings=[h.strip() for h in headings if h.strip()]
    if not 5 <= len(headings) <= 6:
        return ['Outline must contain five or six distinct sections']
    if len(set(h.lower() for h in headings)) != len(headings):
        return ['Outline repeats a section']
    terms={w.rstrip('s') for w in re.findall(r'[a-z]+',keyword.lower()) if w not in STOP and len(w)>2}
    aligned=sum(bool(terms & {w.rstrip('s') for w in re.findall(r'[a-z]+',h.lower())}) for h in headings)
    errors=[]
    if aligned < (len(headings)+1)//2:
        errors.append('Fewer than half the headings address the keyword terms')
    for phrase in ['google business profile','local seo','silver price','investment return']:
        if phrase not in keyword.lower() and any(phrase in h.lower() for h in headings):
            errors.append('Unrequested topic drift: '+phrase)
    return errors

if __name__=='__main__':
    errors=validate(sys.argv[1],sys.stdin.read().splitlines())
    if errors: print('Outline requires editorial repair: '+'; '.join(errors),file=sys.stderr)
    sys.exit(bool(errors))
