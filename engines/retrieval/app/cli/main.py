import argparse, json
from app.config.settings import DB_PATH
from app.db.database import Database

def main():
    p=argparse.ArgumentParser(prog='tnpsc-engine')
    sub=p.add_subparsers(dest='cmd',required=True)
    sub.add_parser('init-db')
    s=sub.add_parser('status')
    args=p.parse_args()
    db=Database(DB_PATH); db.initialize()
    if args.cmd=='init-db': print(f'initialized: {DB_PATH}')
    elif args.cmd=='status':
        with db.connection() as c:
            r=c.execute('SELECT status,COUNT(*) n FROM resources GROUP BY status').fetchall()
            j=c.execute('SELECT status,COUNT(*) n FROM jobs GROUP BY status').fetchall()
        print(json.dumps({'resources':{x['status']:x['n'] for x in r},'jobs':{x['status']:x['n'] for x in j}},indent=2))
if __name__=='__main__': main()
