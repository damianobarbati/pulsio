drop view if exists domains2;
create view domains2 as
select d.*, u.email
from domains as d
inner join users as u on (u.id = d.user_id);
