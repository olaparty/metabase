git reset HEAD~1
rm ./backport.sh
git cherry-pick 7f19247f7f06eb234fc18dbe13f3cfa83f574efc
echo 'Resolve conflicts and force push this branch'
