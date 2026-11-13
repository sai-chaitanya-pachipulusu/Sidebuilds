// Public visibility does not make every internal database column public.
const fields=['project_id','owner_id','owner_username','name','description','stage','category','subcategory','stage_details','domain','demo_url','github_url','tech_stack','tags','monthly_revenue','monthly_users','growth_rate','view_count','is_on_hold','checkout_reserved','is_public','is_for_sale','sale_price','price_negotiable','thumbnail_url','launch_date','updated_at','created_at'];
function publicProjectRecord(project){
 const result=Object.fromEntries(fields.filter(key=>project[key]!==undefined).map(key=>[key,project[key]]));
 if(project.is_for_sale===true || project.is_for_sale===1) for(const key of ['contact_email','contact_phone','payment_method']) result[key]=project[key];
 return {...result,revenue_verified:false,code_quality_verified:false,verified:false};
}
module.exports={publicProjectRecord};
