const db = require('../db');

class Project {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.category = data.category;
    this.stage = data.stage;
    this.technologies = data.technologies || [];
    this.features = data.features || [];
    this.images = data.images;
    this.demo_url = data.demo_url;
    this.github_url = data.github_url;
    this.is_for_sale = data.is_for_sale;
    this.sale_price = data.sale_price;
    this.monthly_revenue = data.monthly_revenue;
    this.user_id = data.user_id;
    this.view_count = data.view_count || 0;
    this.ai_score = data.ai_score || 0;
    this.trending_score = data.trending_score || 0;
    this.last_month_views = data.last_month_views || 0;
    this.engagement_metrics = data.engagement_metrics || {};
    this.seo_keywords = data.seo_keywords || [];
    this.performance_data = data.performance_data || {};
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new project with dynamic features
  static async create(projectData) {
    try {
      const {
        title, description, category, stage, technologies, features,
        images, demo_url, github_url, is_for_sale, sale_price,
        monthly_revenue, user_id, seo_keywords
      } = projectData;

      const result = await db.query(`
        INSERT INTO projects (
          title, description, category, stage, technologies, features,
          images, demo_url, github_url, is_for_sale, sale_price,
          monthly_revenue, user_id, seo_keywords, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *
      `, [
        title, description, category, stage, 
        JSON.stringify(technologies), JSON.stringify(features),
        images, demo_url, github_url, is_for_sale, sale_price,
        monthly_revenue, user_id, JSON.stringify(seo_keywords)
      ]);

      const project = new Project(result.rows[0]);
      
      // Initialize analytics for the project
      await project.initializeAnalytics();
      
      // Calculate initial AI score
      await project.calculateAIScore();
      
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Get project by ID with all related data
  static async findById(id) {
    try {
      const result = await db.query(`
        SELECT 
          p.*,
          pa.view_count as analytics_views,
          pa.unique_views,
          pa.interest_count,
          pa.engagement_score,
          pa.trending_score as analytics_trending,
          ua.seller_rating,
          u.username as seller_name,
          u.profile_picture as seller_avatar,
          array_agg(DISTINCT pt.tag_name) as tags
        FROM projects p
        LEFT JOIN project_analytics pa ON p.id = pa.project_id
        LEFT JOIN user_analytics ua ON p.user_id = ua.user_id
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN project_tags pt ON p.id = pt.project_id
        WHERE p.id = $1
        GROUP BY p.id, pa.view_count, pa.unique_views, pa.interest_count, 
                 pa.engagement_score, pa.trending_score, ua.seller_rating,
                 u.username, u.profile_picture
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return new Project(result.rows[0]);
    } catch (error) {
      console.error('Error finding project:', error);
      throw error;
    }
  }

  // Get projects with advanced filtering and sorting
  static async findWithFilters(filters = {}) {
    try {
      let query = `
        SELECT 
          p.*,
          pa.view_count as analytics_views,
          pa.unique_views,
          pa.engagement_score,
          pa.trending_score as analytics_trending,
          ua.seller_rating,
          u.username as seller_name,
          array_agg(DISTINCT pt.tag_name) as tags
        FROM projects p
        LEFT JOIN project_analytics pa ON p.id = pa.project_id
        LEFT JOIN user_analytics ua ON p.user_id = ua.user_id
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN project_tags pt ON p.id = pt.project_id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 0;

      // Apply filters
      if (filters.category) {
        paramCount++;
        query += ` AND p.category = $${paramCount}`;
        params.push(filters.category);
      }

      if (filters.is_for_sale !== undefined) {
        paramCount++;
        query += ` AND p.is_for_sale = $${paramCount}`;
        params.push(filters.is_for_sale);
      }

      if (filters.min_price) {
        paramCount++;
        query += ` AND p.sale_price >= $${paramCount}`;
        params.push(filters.min_price);
      }

      if (filters.max_price) {
        paramCount++;
        query += ` AND p.sale_price <= $${paramCount}`;
        params.push(filters.max_price);
      }

      if (filters.technologies && filters.technologies.length > 0) {
        paramCount++;
        query += ` AND p.technologies ?| $${paramCount}`;
        params.push(filters.technologies);
      }

      if (filters.min_revenue) {
        paramCount++;
        query += ` AND p.monthly_revenue >= $${paramCount}`;
        params.push(filters.min_revenue);
      }

      if (filters.user_id) {
        paramCount++;
        query += ` AND p.user_id = $${paramCount}`;
        params.push(filters.user_id);
      }

      if (filters.search) {
        paramCount++;
        query += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }

      // Group by clause
      query += ` 
        GROUP BY p.id, pa.view_count, pa.unique_views, pa.engagement_score, 
                 pa.trending_score, ua.seller_rating, u.username
      `;

      // Apply sorting
      if (filters.sort_by) {
        switch (filters.sort_by) {
          case 'trending':
            query += ` ORDER BY COALESCE(pa.trending_score, 0) DESC, p.created_at DESC`;
            break;
          case 'views':
            query += ` ORDER BY COALESCE(pa.view_count, 0) DESC, p.created_at DESC`;
            break;
          case 'price_low':
            query += ` ORDER BY p.sale_price ASC NULLS LAST`;
            break;
          case 'price_high':
            query += ` ORDER BY p.sale_price DESC NULLS LAST`;
            break;
          case 'revenue':
            query += ` ORDER BY p.monthly_revenue DESC NULLS LAST`;
            break;
          case 'ai_score':
            query += ` ORDER BY p.ai_score DESC, p.created_at DESC`;
            break;
          default:
            query += ` ORDER BY p.created_at DESC`;
        }
      } else {
        query += ` ORDER BY p.created_at DESC`;
      }

      // Apply pagination
      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }

      const result = await db.query(query, params);
      return result.rows.map(row => new Project(row));
    } catch (error) {
      console.error('Error finding projects with filters:', error);
      throw error;
    }
  }

  // Update project with dynamic recalculation
  async update(updateData) {
    try {
      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      // Build dynamic update query
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && key !== 'id') {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          
          // Handle JSON fields
          if (['technologies', 'features', 'seo_keywords', 'engagement_metrics', 'performance_data'].includes(key)) {
            updateValues.push(JSON.stringify(updateData[key]));
          } else {
            updateValues.push(updateData[key]);
          }
        }
      });

      if (updateFields.length === 0) {
        return this;
      }

      paramCount++;
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(this.id);

      const query = `
        UPDATE projects 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, updateValues);
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
        
        // Recalculate AI score if relevant fields changed
        if (['monthly_revenue', 'demo_url', 'images', 'description'].some(field => updateData[field] !== undefined)) {
          await this.calculateAIScore();
        }
        
        // Update trending score
        await this.calculateTrendingScore();
      }

      return this;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Initialize analytics for new project
  async initializeAnalytics() {
    try {
      await db.query(`
        INSERT INTO project_analytics (
          project_id, view_count, unique_views, interest_count,
          engagement_score, trending_score, created_at, updated_at
        ) VALUES ($1, 0, 0, 0, 0, 0, NOW(), NOW())
        ON CONFLICT (project_id) DO NOTHING
      `, [this.id]);
    } catch (error) {
      console.error('Error initializing analytics:', error);
      throw error;
    }
  }

  // Calculate AI score using stored procedure
  async calculateAIScore() {
    try {
      const result = await db.query(
        'SELECT calculate_project_ai_score($1) as score',
        [this.id]
      );
      
      this.ai_score = result.rows[0].score;
      return this.ai_score;
    } catch (error) {
      console.error('Error calculating AI score:', error);
      return this.ai_score || 0;
    }
  }

  // Calculate trending score using stored procedure
  async calculateTrendingScore() {
    try {
      const result = await db.query(
        'SELECT calculate_trending_score($1) as score',
        [this.id]
      );
      
      this.trending_score = result.rows[0].score;
      return this.trending_score;
    } catch (error) {
      console.error('Error calculating trending score:', error);
      return this.trending_score || 0;
    }
  }

  // Increment view count with analytics
  async incrementViews(userId = null) {
    try {
      // Update project view count
      await db.query(
        'UPDATE projects SET view_count = view_count + 1 WHERE id = $1',
        [this.id]
      );

      // Update analytics
      const isUniqueView = userId ? await this.checkUniqueView(userId) : false;
      
      await db.query(`
        UPDATE project_analytics 
        SET view_count = view_count + 1,
            unique_views = unique_views + $2,
            last_activity = NOW(),
            updated_at = NOW()
        WHERE project_id = $1
      `, [this.id, isUniqueView ? 1 : 0]);

      // Update trending score based on new activity
      await this.calculateTrendingScore();

      this.view_count = (this.view_count || 0) + 1;
    } catch (error) {
      console.error('Error incrementing views:', error);
      throw error;
    }
  }

  // Check if this is a unique view from user
  async checkUniqueView(userId) {
    try {
      const result = await db.query(`
        SELECT 1 FROM activity_feed 
        WHERE user_id = $1 AND entity_id = $2 AND activity_type = 'viewed'
        AND created_at > NOW() - INTERVAL '24 hours'
      `, [userId, this.id]);
      
      if (result.rows.length === 0) {
        // Log the view activity
        await db.query(`
          INSERT INTO activity_feed (
            user_id, activity_type, entity_type, entity_id, title, created_at
          ) VALUES ($1, 'viewed', 'project', $2, $3, NOW())
        `, [userId, this.id, this.title]);
        
        return true; // Unique view
      }
      
      return false; // Not unique
    } catch (error) {
      console.error('Error checking unique view:', error);
      return false;
    }
  }

  // Add tags to project
  async addTags(tags, tagType = 'custom') {
    try {
      for (const tag of tags) {
        await db.query(`
          INSERT INTO project_tags (project_id, tag_name, tag_type, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (project_id, tag_name) DO NOTHING
        `, [this.id, tag, tagType]);
      }
    } catch (error) {
      console.error('Error adding tags:', error);
      throw error;
    }
  }

  // Get project tags
  async getTags() {
    try {
      const result = await db.query(
        'SELECT tag_name, tag_type FROM project_tags WHERE project_id = $1',
        [this.id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  }

  // Get project analytics
  async getAnalytics() {
    try {
      const result = await db.query(`
        SELECT 
          pa.*,
          (SELECT COUNT(*) FROM purchase_requests WHERE project_id = $1) as total_interest,
          (SELECT COUNT(*) FROM purchase_requests WHERE project_id = $1 AND created_at > NOW() - INTERVAL '7 days') as recent_interest
        FROM project_analytics pa
        WHERE pa.project_id = $1
      `, [this.id]);
      
      return result.rows[0] || {};
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {};
    }
  }

  // Get similar projects based on category and technologies
  async getSimilarProjects(limit = 5) {
    try {
      const result = await db.query(`
        SELECT p.*, pa.view_count, pa.trending_score
        FROM projects p
        LEFT JOIN project_analytics pa ON p.id = pa.project_id
        WHERE p.id != $1 
          AND p.is_for_sale = true
          AND (p.category = $2 OR p.technologies ?| $3)
        ORDER BY 
          CASE WHEN p.category = $2 THEN 2 ELSE 0 END +
          CASE WHEN p.technologies ?| $3 THEN 1 ELSE 0 END DESC,
          COALESCE(pa.trending_score, 0) DESC
        LIMIT $4
      `, [this.id, this.category, this.technologies, limit]);
      
      return result.rows.map(row => new Project(row));
    } catch (error) {
      console.error('Error getting similar projects:', error);
      return [];
    }
  }

  // Get trending projects in same category
  static async getTrending(category = null, limit = 10) {
    try {
      let query = `
        SELECT p.*, pa.view_count, pa.trending_score, pa.engagement_score
        FROM projects p
        LEFT JOIN project_analytics pa ON p.id = pa.project_id
        WHERE p.is_for_sale = true
      `;
      
      const params = [];
      if (category) {
        query += ` AND p.category = $1`;
        params.push(category);
        params.push(limit);
      } else {
        params.push(limit);
      }
      
      query += ` 
        ORDER BY COALESCE(pa.trending_score, 0) DESC, 
                 COALESCE(pa.view_count, 0) DESC
        LIMIT $${params.length}
      `;
      
      const result = await db.query(query, params);
      return result.rows.map(row => new Project(row));
    } catch (error) {
      console.error('Error getting trending projects:', error);
      return [];
    }
  }

  // Search projects with full-text search
  static async search(searchTerm, filters = {}) {
    try {
      let query = `
        SELECT p.*, pa.view_count, pa.trending_score,
               ts_rank(to_tsvector('english', p.title || ' ' || p.description), plainto_tsquery('english', $1)) as rank
        FROM projects p
        LEFT JOIN project_analytics pa ON p.id = pa.project_id
        WHERE to_tsvector('english', p.title || ' ' || p.description) @@ plainto_tsquery('english', $1)
          AND p.is_for_sale = true
      `;
      
      const params = [searchTerm];
      let paramCount = 1;
      
      // Apply additional filters
      if (filters.category) {
        paramCount++;
        query += ` AND p.category = $${paramCount}`;
        params.push(filters.category);
      }
      
      if (filters.min_price) {
        paramCount++;
        query += ` AND p.sale_price >= $${paramCount}`;
        params.push(filters.min_price);
      }
      
      if (filters.max_price) {
        paramCount++;
        query += ` AND p.sale_price <= $${paramCount}`;
        params.push(filters.max_price);
      }
      
      query += ` ORDER BY rank DESC, COALESCE(pa.trending_score, 0) DESC`;
      
      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }
      
      const result = await db.query(query, params);
      return result.rows.map(row => new Project(row));
    } catch (error) {
      console.error('Error searching projects:', error);
      return [];
    }
  }

  // Soft delete project
  async delete() {
    try {
      await db.query(
        'UPDATE projects SET deleted_at = NOW() WHERE id = $1',
        [this.id]
      );
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      category: this.category,
      stage: this.stage,
      technologies: this.technologies,
      features: this.features,
      images: this.images,
      demo_url: this.demo_url,
      github_url: this.github_url,
      is_for_sale: this.is_for_sale,
      sale_price: this.sale_price,
      monthly_revenue: this.monthly_revenue,
      user_id: this.user_id,
      view_count: this.view_count,
      ai_score: this.ai_score,
      trending_score: this.trending_score,
      engagement_metrics: this.engagement_metrics,
      seo_keywords: this.seo_keywords,
      performance_data: this.performance_data,
      created_at: this.created_at,
      updated_at: this.updated_at,
      // Additional computed fields
      seller_name: this.seller_name,
      seller_rating: this.seller_rating,
      tags: this.tags
    };
  }
}

module.exports = Project;