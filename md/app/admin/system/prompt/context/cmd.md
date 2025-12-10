# 核心功能
## 文件结构
- **前台页面** app/admin/system/prompt/context/page.tsx
- **后台程序** app/api/admin/system/prompt/context/route.ts
- **规则文件** md/app/admin/system/prompt/context/cmd.md
- **数据库表** md/database/5_context.sql

## 全局功能
 - 执行该md文件后，把"需要执行的操作"至"已执行完毕、忽略不执行的操作"之间区域的内容，剪切追加至本文件的末尾



## 需要执行的操作
- 在页面中以页签的形式，分别实现以下表的增删改查功能；
表：
prompt_flow_steps      
prompt_flows           
prompt_env_versions    
environments           
prompt_template_tags   
prompt_tags            
prompt_template_variables 
prompt_template_versions 
prompt_templates       
projects
               

## 已执行完毕、忽略不执行的操作
- 在页面中以页签的形式，分别实现以下表的增删改查功能；
表：
prompt_flow_steps      
prompt_flows           
prompt_env_versions    
environments           
prompt_template_tags   
prompt_tags            
prompt_template_variables 
prompt_template_versions 
prompt_templates       
projects